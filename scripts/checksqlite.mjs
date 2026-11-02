try {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  db.prepare('INSERT INTO t (name) VALUES (?)').run('hi');
  const row = db.prepare('SELECT name FROM t').get();
  console.log('node:sqlite OK', JSON.stringify(row));
  db.close();
} catch (e) {
  console.log('node:sqlite NOT available:', e.message);
}
