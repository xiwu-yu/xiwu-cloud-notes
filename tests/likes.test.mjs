import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/likes/index.mjs';
import {database} from './likes-db.mjs';
import {likesConfig,likeMarkup} from '../scripts/likes.mjs';

const origin='https://cloud.xiwu.space';
const token='a'.repeat(64);
const setup=()=>({DB:database(),VISITOR_SECRET:'test-only-not-for-deployment-secret-value',ALLOWED_ORIGINS:origin,ARTICLE_IDS:'rain,cloud'});
function call(env,{method='GET',id='rain',body,auth=token,site=origin,ip='192.0.2.1',headers={}}={}) {
  return worker.fetch(new Request('https://likes.test/v1/articles/'+id,{method,headers:{Origin:site,Authorization:'Bearer '+auth,'CF-Connecting-IP':ip,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})}),env);
}

test('likes configuration is disabled by default, permits only HTTPS origins and escapes static labels',()=>{
  assert.equal(likesConfig(null),null);assert.equal(likesConfig({apiUrl:null}),null);
  assert.equal(likesConfig({apiUrl:'https://likes.example.workers.dev/'}),'https://likes.example.workers.dev');
  for(const apiUrl of ['http://likes.test','https://a.test/path','https://u:p@a.test','https://a.test/?x=1','javascript:1','',undefined])assert.throws(()=>likesConfig({apiUrl}),/apiUrl/);
  assert.match(likeMarkup('rain',null,{'likes.like':'<script>'}),/&lt;script&gt;/);
});

test('shared SQLite counts, idempotent desired state, anonymous identity and per-article isolation',async()=>{
  const env=setup();
  try {
    assert.deepEqual(await (await call(env)).json(),{id:'rain',count:0,liked:false});
    const updates=await Promise.all(Array.from({length:8},()=>call(env,{method:'PUT',body:{liked:true}})));
    for(const response of updates){assert.equal(response.status,200);assert.deepEqual(await response.json(),{id:'rain',count:1,liked:true});}
    assert.deepEqual(await (await call(env,{auth:'b'.repeat(64)})).json(),{id:'rain',count:1,liked:false});
    assert.equal((await (await call(env,{method:'PUT',auth:'b'.repeat(64),body:{liked:true}})).json()).count,2);
    assert.equal((await (await call(env,{id:'cloud'})).json()).count,0);
    for(let i=0;i<2;i++)assert.deepEqual(await (await call(env,{method:'PUT',body:{liked:false}})).json(),{id:'rain',count:1,liked:false});
    assert.equal(env.DB.sql.prepare('SELECT COUNT(*) AS n FROM article_likes').get().n,1);
    const stored=env.DB.sql.prepare('SELECT visitor_hash FROM article_likes').get().visitor_hash;
    assert.notEqual(stored,'b'.repeat(64));assert.match(stored,/^[a-f0-9]{64}$/);
    assert.equal(env.DB.sql.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  } finally {env.DB.close();}
});

test('rejects foreign origins, missing identity, unknown articles, oversized or fabricated state and unsupported methods',async()=>{
  const env=setup();
  try {
    for(const [options,status] of [[{site:'https://evil.test'},403],[{auth:''},401],[{id:'unknown'},404],[{id:'rain%27'},404],[{method:'POST'},405],[{method:'PUT',body:{liked:1}},400],[{method:'PUT',body:{liked:true,count:999}},400],[{method:'PUT',body:'x'.repeat(129)},413],[{method:'PUT',body:'broken'},400]]) assert.equal((await call(env,options)).status,status);
    const preflight=await call(env,{method:'OPTIONS'});assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
    assert.equal((await call(env,{site:'null'})).headers.get('Access-Control-Allow-Origin'),null);
    assert.equal((await call(env)).headers.get('Cache-Control'),'no-store');
    assert.equal(env.DB.sql.prepare('SELECT COUNT(*) AS n FROM article_likes').get().n,0);
  } finally {env.DB.close();}
});

test('atomic rate limiter blocks excess writes across identities; scheduled cleanup leaves votes intact',async()=>{
  const env=setup();
  try {
    for(let i=0;i<20;i++)assert.equal((await call(env,{method:'PUT',body:{liked:true},auth:i.toString(16).padStart(64,'0')})).status,200);
    const response=await call(env,{method:'PUT',body:{liked:true},auth:'f'.repeat(64)});
    assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');
    assert.equal((await (await call(env)).json()).count,20);
    assert.equal((await call(env,{method:'PUT',body:{liked:true},ip:'192.0.2.2'})).status,200);
    env.DB.sql.exec('UPDATE rate_limits SET expires_at=0');
    await worker.scheduled({},env);
    assert.equal(env.DB.sql.prepare('SELECT COUNT(*) AS n FROM rate_limits').get().n,0);
    assert.equal((await (await call(env)).json()).count,21);
  } finally {env.DB.close();}
});

test('unknown backend state fails closed, never returns a fabricated zero or database detail',async()=>{
  const env=setup();
  try {
    assert.equal((await call({...env,VISITOR_SECRET:''})).status,503);
    assert.equal((await call(env,{ip:''})).status,503);
    const response=await call({...env,DB:{prepare(){throw new Error('private database details');}}});
    assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});
  } finally {env.DB.close();}
});
