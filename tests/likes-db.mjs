import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

// 实际 SQLite 约束/触发器/事务；仅适配 D1 的调用形状，不伪造 SQL 结果。
export function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../workers/likes/migrations/0001_likes.sql',import.meta.url),'utf8'));
  const prepare = sql => {
    let params=[];
    const statement={
      bind(...values){params=values;return statement;},
      async first(){return db.prepare(sql).get(...params) || null;},
      async run(){return db.prepare(sql).run(...params);},
      execute(){const prepared=db.prepare(sql);return {results:/^\s*(SELECT|WITH)\b/i.test(sql)?prepared.all(...params):(prepared.run(...params),[])};}
    };
    return statement;
  };
  return {
    prepare,
    async batch(statements){db.exec('BEGIN');try {const results=statements.map(s=>s.execute());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}},
    close:()=>db.close(), sql:db
  };
}
