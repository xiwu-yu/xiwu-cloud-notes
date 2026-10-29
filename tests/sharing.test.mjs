import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sharePanel,staticShare} from '../scripts/sharing.mjs';

test('static sharing keeps original content and escapes untrusted metadata and translated strings',async()=>{
  const dictionaries=JSON.parse(await readFile(new URL('../content/ui.json',import.meta.url),'utf8'));
  const title='标题 " ><img src=x onerror=alert(1)> & 🍥';
  const post={id:'safe-id',lang:'en',title,description:'A < B & "quoted"',category:'<script>unsafe</script>',writtenAt:null,publishedAt:'2026-10-01T08:00:00Z'};
  for(const ui of Object.values(dictionaries)){
    const html=staticShare(post,'Xiwu','https://example.org/notes/posts/safe-id/en.html',ui);
    assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));
    assert.match(html,/data-share-date="2026-10-01"/);
    assert.match(html,/data-share-url="https:\/\/example.org\/notes\/posts\/safe-id\/en.html"/);
    const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    assert.equal(decode(html.match(/data-share-title="([^"]*)"/)[1]),title);
    const strings=JSON.parse(decode(html.match(/data-share-strings="([^"]*)"/)[1]));
    assert.equal(strings['share.loading'],ui['share.loading']);
    assert.equal(strings['dialog.shareCopied'],ui['dialog.shareCopied']);
    assert.ok(!Object.hasOwn(strings,'likes.error'));
    assert.match(sharePanel(ui),/aria-labelledby="article-share-title"/);
    assert.ok(sharePanel(ui).includes(ui['share.download']));
  }
});
