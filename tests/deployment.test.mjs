import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../scripts/build.mjs';
import { buildInfo } from '../scripts/build-info.mjs';
import { resolveSiteUrl } from '../scripts/static.mjs';
import { verifySite } from '../scripts/verify-site.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const options = {builtAt:'2026-10-25T08:00:00Z',source:'github-actions'};
const article = '---\ntitle: 清单\ncategory: 日常\ndescription: 只有列表的合法文章\npublishedAt: "2026-10-25T16:00:00+08:00"\n---\n\n- 一条记录\n- 另一条记录\n';
async function repository() {
  const root = await mkdtemp(join(tmpdir(), 'xiwu-deployment-'));
  for (const directory of ['content','scripts','dist']) await cp(new URL(`../${directory}/`,import.meta.url),join(root,directory),{recursive:true});
  await cp(new URL('../.gitignore',import.meta.url),join(root,'.gitignore'));
  await cp(new URL('../package.json',import.meta.url),join(root,'package.json'));
  git(root,'init','--quiet');
  git(root,'config','user.name','Build metadata test');
  git(root,'config','user.email','build-test@example.invalid');
  commit(root);
  return root;
}
function commit(root) {
  git(root,'add','-A');
  git(root,'-c','commit.gpgsign=false','commit','--quiet','--allow-empty','-m','Fixture source snapshot');
  return git(root,'rev-parse','HEAD');
}
const loader = root => (path,binary) => readFile(join(root,'dist',path),binary ? undefined : 'utf8');

test('likes config reaches both readers with hashed assets, subpaths and four-language labels; invalid API preserves the last build', async()=>{
  const root=await repository();
  try {
    await writeFile(join(root,'content/likes.json'),JSON.stringify({apiUrl:'https://likes.example.workers.dev'}));
    await build(root,{...options,siteUrl:'https://example.org/notes/'});
    const home=await readFile(join(root,'dist/index.html'),'utf8');
    assert.match(home,/src="likes\.js\?v=[a-f0-9]{10}"/);
    assert.match(await readFile(join(root,'dist/profile.js'),'utf8'),/"likes":"https:\/\/likes.example.workers.dev"/);
    for(const lang of ['zh-CN','zh-TW','en','ja']) {
      const html=await readFile(join(root,`dist/posts/xiwu/${lang}.html`),'utf8');
      assert.match(html,/data-article-id="xiwu"/);
      assert.match(html,/data-api-url="https:\/\/likes.example.workers.dev"/);
      assert.match(html,/src="\.\.\/\.\.\/likes\.js\?v=[a-f0-9]{10}"/);
      const ui=JSON.parse(await readFile(join(root,'content/ui.json'),'utf8'));
      assert.ok(html.includes(`data-likes-like="${ui[lang]['likes.like']}"`));
      assert.ok(html.includes(`https://example.org/notes/posts/xiwu/${lang}.html`));
    }
    await writeFile(join(root,'content/likes.json'),JSON.stringify({apiUrl:'http://bad.test'}));
    await assert.rejects(build(root),/apiUrl.*HTTPS/);
    assert.equal(await readFile(join(root,'dist/index.html'),'utf8'),home);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('site base URL accepts HTTPS roots/subpaths and rejects unsafe bases; invalid build time fails', () => {
  assert.equal(resolveSiteUrl(),'https://cloud.xiwu.space/');
  assert.equal(resolveSiteUrl('https://xiwu-yu.github.io/xiwu-cloud-notes'),'https://xiwu-yu.github.io/xiwu-cloud-notes/');
  for (const value of ['',null,123,'javascript:alert(1)','http://example.com/','https://u:p@example.com/','https://example.com/?lang=en','https://example.com/#home']) assert.throws(()=>resolveSiteUrl(value),/baseUrl.*HTTPS/);
  assert.throws(()=>buildInfo('.',resolveSiteUrl(),{builtAt:'invalid'}),/builtAt/);
});

test('real Git provenance includes untracked articles/scripts, ignores outputs, and never treats unavailable status as clean', async () => {
  const root=await repository();
  const load=loader(root);
  try {
    await build(root,options); // 标准化当前生成的首页，再提交实际构建源。
    const sha=commit(root);
    await build(root,options);
    assert.equal(JSON.parse(await load('build-info.json')).commitSha,sha);
    assert.equal(JSON.parse(await load('build-info.json')).workingTreeDirty,false);
    await verifySite({siteUrl:resolveSiteUrl(),load,expectedSha:sha});
    await writeFile(join(root,'content/posts/fourth.md'),article);
    await build(root,options);
    const dirty=JSON.parse(await load('build-info.json'));
    assert.equal(dirty.commitSha,sha);
    assert.equal(dirty.workingTreeDirty,true);
    assert.match(await load('posts/fourth/zh-CN.html'),/另一条记录/);
    await assert.rejects(verifySite({siteUrl:resolveSiteUrl(),load,expectedSha:sha}),/未提交构建输入/);
    await rm(join(root,'content/posts/fourth.md'));
    await build(root,options);
    assert.equal(buildInfo(root,resolveSiteUrl()).workingTreeDirty,false);
    await writeFile(join(root,'scripts/new-source.mjs'),'// untracked build helper\n');
    assert.equal(buildInfo(root,resolveSiteUrl()).workingTreeDirty,true);
    await rm(join(root,'scripts/new-source.mjs'));
    const sitePath=join(root,'content/site.json'),site=await readFile(sitePath);
    await writeFile(sitePath,Buffer.concat([site,Buffer.from('\n')]));
    assert.equal(buildInfo(root,resolveSiteUrl()).workingTreeDirty,true);
    await writeFile(sitePath,site);
    for (const [path,text] of [['node_modules/example/index.js','dependency'],['work/trace.log','output'],['dist/profile.js','generated'],['dist/posts/generated/en.html','generated']]) {
      await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),text);
    }
    assert.equal(buildInfo(root,resolveSiteUrl()).workingTreeDirty,false);
    // 即使误写 ignore，参与构建的 Markdown 也必须算脏。
    const ignore=await readFile(join(root,'.gitignore'),'utf8');
    await writeFile(join(root,'.gitignore'),ignore+'\ncontent/posts/ignored.md\n');
    commit(root);
    await writeFile(join(root,'content/posts/ignored.md'),article);
    await build(root,options);
    assert.equal(JSON.parse(await load('build-info.json')).workingTreeDirty,true);
    await rm(join(root,'content/posts/ignored.md'));
    const oldIndex=process.env.GIT_INDEX_FILE;
    try {
      process.env.GIT_INDEX_FILE=join(root,'.git'); // 真 Git 的 status 读取失败，而 HEAD 仍能读取。
      const unknown=buildInfo(root,resolveSiteUrl());
      assert.equal(unknown.commitSha,git(root,'rev-parse','HEAD'));
      assert.equal(unknown.workingTreeDirty,null);
      await build(root,options);
      await verifySite({siteUrl:resolveSiteUrl(),load}); // 本地未知来源仍允许预览和校验正文。
      await assert.rejects(verifySite({siteUrl:resolveSiteUrl(),load,expectedSha:unknown.commitSha}),/unknown\/null/);
    } finally {if(oldIndex===undefined)delete process.env.GIT_INDEX_FILE;else process.env.GIT_INDEX_FILE=oldIndex;}
    await rm(join(root,'.git'),{recursive:true});
    await build(root,options);
    const unknown=JSON.parse(await load('build-info.json'));
    assert.equal(unknown.commitSha,null);
    assert.equal(unknown.workingTreeDirty,null);
    await verifySite({siteUrl:resolveSiteUrl(),load});
    await assert.rejects(verifySite({siteUrl:resolveSiteUrl(),load,expectedSha:sha}));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('root/subpath builds have truthful static metadata and provenance; bad rebuilds preserve outputs', async () => {
  const root=await repository(),load=loader(root);
  const previousEnv=process.env.SITE_URL;
  try {
    delete process.env.SITE_URL;
    await writeFile(join(root,'content/posts/list-only.md'),article);
    const site=JSON.parse(await readFile(join(root,'content/site.json')));
    let sha;
    for(const siteUrl of ['https://cloud.xiwu.space/','https://example.org/notes/']) {
      site.baseUrl=siteUrl;await writeFile(join(root,'content/site.json'),JSON.stringify(site));
      await build(root,options);sha=commit(root);await build(root,options);
      const result=await verifySite({siteUrl,load,expectedSha:sha});
      assert.ok(result.pages>1);assert.ok(result.assets>5);
      assert.equal(result.builtAt,'2026-10-25T08:00:00.000Z');
      const html=await load('posts/xiwu/zh-CN.html');
      assert.ok(html.includes(`${siteUrl}posts/xiwu/zh-CN.html`));
      assert.ok(html.includes('href="../../?lang=zh-CN"'));
      assert.doesNotMatch(await load('index.html'),/xiwu-yu\.github\.io/);
      const home=await load('index.html');
      assert.match(home,/<html lang="zh-CN"/);
      assert.match(home,/欢迎来到夕雾的/);
      assert.doesNotMatch(home,/<link[^>]+hreflang=/);
      assert.match(home,/property="og:locale" content="zh_CN"/);
      const recovery=await load('404.html');
      assert.ok(recovery.includes(`href="${new URL(siteUrl).pathname}?lang=en#static-archive"`));
      assert.ok(recovery.includes(`href="${new URL(siteUrl).pathname}style.css?v=`));
    }
    process.env.SITE_URL='https://preview.example.org/branch/';
    await build(root,options);sha=commit(root);await build(root,options);
    await verifySite({siteUrl:process.env.SITE_URL,load,expectedSha:sha});
    const before=await load('build-info.json'),index=await load('index.html');
    process.env.SITE_URL='https://example.org/?unsafe=1';
    await assert.rejects(build(root,options),/baseUrl/);
    assert.equal(await load('build-info.json'),before);assert.equal(await load('index.html'),index);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/',load,expectedSha:'b'.repeat(40)}),/commit SHA/);
    const corrupt=(path,binary)=>path==='posts/xiwu/zh-CN.html'?load(path).then(html=>html.replace(/rel="canonical" href="[^"]+"/,'rel="canonical" href="https://wrong.example/"')):load(path,binary);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/',load:corrupt}),/canonical/);
    const missing=(path,binary)=>path==='script.js'?Promise.reject(new Error('HTTP 404 script.js')):load(path,binary);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/',load:missing}),/404 script/);
    const changed=(path,binary)=>path==='script.js'?Promise.resolve(Buffer.from('changed')):load(path,binary);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/',load:changed}),/内容哈希不符/);
    const falseTranslation=(path,binary)=>path==='index.html'?load(path).then(html=>html.replace('</head>','<link rel="alternate" hreflang="en" href="https://preview.example.org/branch/?lang=en"></head>')):load(path,binary);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/',load:falseTranslation}),/静态译本/);
  } finally {
    if(previousEnv===undefined)delete process.env.SITE_URL;else process.env.SITE_URL=previousEnv;
    await rm(root,{recursive:true,force:true});
  }
});
