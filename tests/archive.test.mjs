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
