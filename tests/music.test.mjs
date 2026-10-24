import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { musicConfig } from '../scripts/music.mjs';
import { build } from '../scripts/build.mjs';

test('music config accepts playlist IDs only and builds official HTTPS links with autoplay off', () => {
  const config = musicConfig({playlistId:'123456789',title:'测试歌单',creator:'作者'});
  assert.equal(config.iframeUrl,'https://music.163.com/outchain/player?type=0&id=123456789&auto=0&height=430');
  assert.equal(config.playlistUrl,'https://music.163.com/playlist?id=123456789');
  assert.equal(musicConfig(null),null);
  assert.equal(musicConfig(undefined),null);
  for (const playlistId of [123456789,'0','-1','1&auto=1','https://example.com','1.2','']) {
    assert.throws(() => musicConfig({playlistId,title:'歌单',creator:'作者'}),/content\/site.json: music.playlistId/);
  }
  assert.throws(()=>musicConfig([]),/music.*配置对象/);
  assert.throws(()=>musicConfig({playlistId:'1',title:'',creator:'作者'}),/music.title/);
});

test('changing or removing the playlist config updates markup; invalid config preserves the last build', async () => {
  const root=await mkdtemp(join(tmpdir(),'xiwu-music-'));
  try {
    await cp(new URL('../content/',import.meta.url),join(root,'content'),{recursive:true});
    await cp(new URL('../dist/',import.meta.url),join(root,'dist'),{recursive:true});
    const site=JSON.parse(await readFile(join(root,'content/site.json'),'utf8'));
    site.music={playlistId:'123456789',title:'<测试歌单>',creator:'作者'};
    const save = () => writeFile(join(root,'content/site.json'),JSON.stringify(site));
    await save();
    await build(root);
    const good=await readFile(join(root,'dist/index.html'),'utf8');
    assert.match(good,/data-src="https:\/\/music.163.com\/outchain\/player\?type=0&amp;id=123456789&amp;auto=0&amp;height=430"/);
    assert.match(good,/href="https:\/\/music.163.com\/playlist\?id=123456789"/);
    assert.match(good,/&lt;测试歌单&gt;/);
    assert.doesNotMatch(good,/<iframe[^>]+\ssrc=/);
    const profile=await readFile(join(root,'dist/profile.js'),'utf8');
    site.music.playlistId='1&auto=1';
    await save();
    await assert.rejects(build(root),/music.playlistId/);
    assert.equal(await readFile(join(root,'dist/index.html'),'utf8'),good);
    assert.equal(await readFile(join(root,'dist/profile.js'),'utf8'),profile);
    site.music=null;
    await save();
    await build(root);
    assert.doesNotMatch(await readFile(join(root,'dist/index.html'),'utf8'),/id="music-(?:widget|frame|static-link)"/);
  } finally {await rm(root,{recursive:true,force:true});}
});
