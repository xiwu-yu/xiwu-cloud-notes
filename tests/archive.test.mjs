import test from 'node:test';
import assert from 'node:assert/strict';
import '../dist/archive.js';
const archive = globalThis.essayArchive;
const entries = [
  {id:'a',category:'随笔',writtenAt:'2026-10-14',publishedAt:'2026-10-24T16:00:00+08:00'},
  {id:'b',category:'随笔',writtenAt:'2026-09-30',publishedAt:'2026-10-25T09:00:00+08:00'},
  {id:'c',category:'其他',writtenAt:null,publishedAt:'2026-10-23T09:00:00+08:00'},
  {id:'d',category:'其他',writtenAt:'2026-10-20',publishedAt:'2026-09-30T16:30:00Z'}
];

test('Upload and writing dates sort independently in both directions', () => {
  assert.deepEqual(archive.select(entries).map(x=>x.id),['b','a','c','d']);
  assert.deepEqual(archive.select(entries,{order:'oldest'}).map(x=>x.id),['d','c','a','b']);
  assert.deepEqual(archive.select(entries,{dateBy:'writtenAt'}).map(x=>x.id),['d','a','b','c']);
  assert.deepEqual(archive.select(entries,{dateBy:'writtenAt',order:'oldest'}).map(x=>x.id),['b','a','d','c']);
  assert.deepEqual(entries.map(x=>x.id),['a','b','c','d']);
});

test('Months, combined filters and undated groups use the selected date field', () => {
  assert.deepEqual(archive.months(entries),['2026-10']);
  assert.deepEqual(archive.months(entries,'writtenAt'),['2026-10','2026-09']);
  assert.deepEqual(archive.select(entries,{dateBy:'writtenAt',month:'2026-10',category:'随笔'}).map(x=>x.id),['a']);
  assert.deepEqual(archive.select(entries,{dateBy:'writtenAt',month:'undated'}).map(x=>x.id),['c']);
  assert.equal(archive.select(entries,{month:'undated'}).length,0);
  assert.equal(archive.select(entries,{dateBy:'writtenAt',month:'2026-08'}).length,0);
  assert.deepEqual(archive.groups(archive.select(entries,{dateBy:'writtenAt'}),'writtenAt').map(x=>x.key),['2026-10-20','2026-10-14','2026-09-30','undated']);
  assert.equal(archive.dateKey(archive.itemDate(entries[3])),'2026-10-01');
  assert.equal(archive.dateKey(archive.itemDate(entries[0],'writtenAt')),'2026-10-14');
});

test('Equal writing dates keep a stable order, missing dates never fall back to uploads', () => {
  const tied=[{id:'a',writtenAt:'2026-10-14'},{id:'b',writtenAt:'2026-10-14'},{id:'c',publishedAt:'2027-01-01T00:00:00Z'}];
  assert.deepEqual(archive.select(tied,{dateBy:'writtenAt'}).map(x=>x.id),['a','b','c']);
  assert.equal(archive.itemDate(tied[2],'writtenAt'),undefined);
});

test('Category filters use the language-neutral category key when present', () => {
  const localized=[
    {id:'a',category:'Gender & Life',categoryKey:'性别与生活',publishedAt:'2026-10-24T16:00:00+08:00'},
    {id:'b',category:'Life & Feelings',categoryKey:'生活与情绪',publishedAt:'2026-10-23T16:00:00+08:00'}
  ];
  assert.deepEqual(archive.select(localized,{category:'性别与生活'}).map(x=>x.id),['a']);
  assert.deepEqual(archive.select(localized,{category:'生活与情绪'}).map(x=>x.id),['b']);
  assert.equal(archive.select(localized,{category:'不存在'}).length,0);
});

test('Japanese kana count toward reading length alongside Han characters and Latin words', () => {
  assert.ok(archive.wordCount('こんにちは、世界。') >= 7);
  assert.ok(archive.wordCount('Hello 世界') >= 3);
  assert.equal(archive.wordCount(''),0);
});

test('Search matches localized titles, tags and body text, requiring every term', () => {
  const searchable = [
    {id:'xiwu',title:'夕雾',description:'一首短诗',category:'诗词与随想',categoryKey:'诗词与随想',tags:['诗','成长'],text:'昔雾曾隔长夜望，不知彼岸是今朝。',publishedAt:'2026-10-24T18:27:42+08:00'},
    {id:'claw-marks',title:'在死亡来临之前',description:'关于朋友',category:'生活与情绪',categoryKey:'生活与情绪',tags:['旧文'],text:'我写下了爪痕。',publishedAt:'2026-10-24T16:15:16+08:00'},
    {id:'hrt-preface',title:'HRT 前言',description:'开始 HRT',category:'性别与生活',categoryKey:'性别与生活',tags:['HRT'],text:'2026 年 3 月 12 日。',publishedAt:'2026-10-24T15:51:51+08:00'}
  ];
  assert.deepEqual(archive.select(searchable,{query:'爪痕'}).map(x=>x.id),['claw-marks']);
  assert.deepEqual(archive.select(searchable,{query:'诗'}).map(x=>x.id),['xiwu']);
  assert.deepEqual(archive.select(searchable,{query:'HRT'}).map(x=>x.id),['hrt-preface']);
  assert.deepEqual(archive.select(searchable,{query:'诗 成长'}).map(x=>x.id),['xiwu']);
  assert.equal(archive.select(searchable,{query:'诗 不存在'}).length,0);
  assert.equal(archive.select(searchable,{query:'  '}).length,3);
});
