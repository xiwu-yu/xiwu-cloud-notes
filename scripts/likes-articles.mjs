import {readFile,writeFile,readdir} from 'node:fs/promises';
import {compilePosts} from './content.mjs';

// 显式的后端部署准备，不让普通站点构建修改 Worker 配置或部署服务。
const root=new URL('../',import.meta.url);
const directory=new URL('content/posts/',root);
const files=(await readdir(directory)).filter(name=>name.endsWith('.md')).sort();
const posts=compilePosts(await Promise.all(files.map(async filename=>({filename,source:await readFile(new URL(filename,directory),'utf8')}))));
const ids=[...new Set(posts.map(post=>post.id))].sort();
const path=new URL('workers/likes/wrangler.jsonc',root);
const config=JSON.parse((await readFile(path,'utf8')).replace(/^\s*\/\/.*$/gm,''));
config.vars.ARTICLE_IDS=ids.join(',');
await writeFile(path,JSON.stringify(config,null,2)+'\n');
console.log(`已同步 ${ids.length} 个文章 ID；请复核配置后部署 Worker。`);
