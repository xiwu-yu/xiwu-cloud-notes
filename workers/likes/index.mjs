// 不接收客户端计数；唯一关系与计数触发器在同一 D1 事务内更新。
const encoder = new TextEncoder();
async function digest(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
const list = value => String(value || '').split(',').map(s=>s.trim()).filter(Boolean);
const validToken = value => /^[a-f0-9]{64}$/.test(value);
const stateSql = `SELECT COALESCE((SELECT total FROM article_counts WHERE article_id = ?), 0) AS count,
  EXISTS(SELECT 1 FROM article_likes WHERE article_id = ? AND visitor_hash = ?) AS liked`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = list(env.ALLOWED_ORIGINS).includes(origin);
    const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    if (allowed) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {status,headers:{...headers,...extra}});
    if (!allowed) return reply({error:'origin'},403);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
    const path = new URL(request.url).pathname;
    const match = path.length <= 1024 && /^\/v1\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
    if (!match || !list(env.ARTICLE_IDS).includes(match[1])) return reply({error:'article'},404);
    if (!['GET','PUT'].includes(request.method)) return reply({error:'method'},405,{'Allow':'GET, PUT, OPTIONS'});
    if (!env.DB || typeof env.VISITOR_SECRET !== 'string' || env.VISITOR_SECRET.length < 32) return reply({error:'unavailable'},503);
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
    if (!validToken(token)) return reply({error:'identity'},401);
    try {
      const id = match[1];
      const now = Math.floor(Date.now()/1000);
      // CF-Connecting-IP 由 Cloudflare 边缘提供；只保存每日轮换的 HMAC，不保存原始 IP。
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return reply({error:'unavailable'},503);
      const ipHash = await digest(env.VISITOR_SECRET,`ip:${Math.floor(now/86400)}:${ip}`);
      const minute = Math.floor(now/60);
      const write = request.method === 'PUT';
      const bucket = `${write?'write':'read'}:${ipHash}:${minute}`;
      // 原子增加并返回，跨 Worker 实例也不会丢失次数。超额时不继续写入。
      const rate = await env.DB.prepare(`INSERT INTO rate_limits(bucket,requests,expires_at) VALUES(?,1,?)
        ON CONFLICT(bucket) DO UPDATE SET requests=requests+1 WHERE requests <= ? RETURNING requests`).bind(bucket,now+120,write?20:120).first();
      if (!rate || rate.requests > (write?20:120)) return reply({error:'rate_limit'},429,{'Retry-After':'60'});
      const visitor = await digest(env.VISITOR_SECRET,`visitor:${token}`);
      const read = env.DB.prepare(stateSql).bind(id,id,visitor);
      let state;
      if (write) {
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'json'},415);
        // 流式读取也设上限，不信任 Content-Length。
        const stream = request.body?.getReader();
        if (!stream) return reply({error:'body'},400);
        let text = '', bytes = 0;
        const decoder = new TextDecoder();
        while (true) {
          const chunk = await stream.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 128) { await stream.cancel(); return reply({error:'body'},413); }
          text += decoder.decode(chunk.value,{stream:true});
        }
        let body;
        try { body=JSON.parse(text+decoder.decode()); } catch { return reply({error:'body'},400); }
        if (typeof body?.liked !== 'boolean' || Object.keys(body).length !== 1) return reply({error:'body'},400);
        const mutation = body.liked
          ? env.DB.prepare('INSERT OR IGNORE INTO article_likes(article_id,visitor_hash,created_at) VALUES(?,?,?)').bind(id,visitor,now)
          : env.DB.prepare('DELETE FROM article_likes WHERE article_id = ? AND visitor_hash = ?').bind(id,visitor);
        const result = await env.DB.batch([mutation,read]);
        state = result[1].results[0];
      } else state = await read.first();
      return reply({id,count:state.count,liked:Boolean(state.liked)});
    } catch {
      // 不回传数据库内容、匿名凭证、SQL 或配置。
      return reply({error:'unavailable'},503);
    }
  },
  async scheduled(_event, env) {
    await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Math.floor(Date.now()/1000)).run();
  }
};
