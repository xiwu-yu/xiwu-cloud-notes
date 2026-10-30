import test from 'node:test';
import assert from 'node:assert/strict';
import {commentsConfig,commentsMarkup} from '../scripts/comments.mjs';
const config={enabled:true,repo:'xiwu-yu/xiwu-cloud-notes',repoId:'R_kgDOVU6AUw',category:'文章评论',categoryId:'DIC_test'};
test('comments require explicit valid configuration and escape static labels',()=>{
  assert.equal(commentsConfig(null),null);assert.equal(commentsConfig({enabled:false}),null);
  assert.equal(commentsConfig(config).repo,config.repo);
  for(const value of [{...config,enabled:'true'},{...config,repo:'https://evil.test/x'},{...config,categoryId:null},{...config,repoId:'<bad>'},{...config,category:''}])assert.throws(()=>commentsConfig(value),/content\/comments.json/);
  assert.equal(commentsMarkup('rain',null,{}),'');
  const html=commentsMarkup('rain',commentsConfig(config),{'comments.title':'<评论>','comments.hint':'public','comments.github':'GitHub','comments.load':'Load'});
  assert.match(html,/&lt;评论&gt;/);assert.match(html,/data-article-id="rain"/);assert.match(html,/xiwu-article%3Arain/);
  assert.doesNotMatch(html,/<script|<iframe/); // No JavaScript/third-party request is required to find the public fallback.
});
