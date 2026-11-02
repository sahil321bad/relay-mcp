// Persistent store backed by SQLite (node:sqlite). Data survives restarts.
// One table `collections(name, id, data)` holds every collection; the Collection
// class exposes the same API the routes/engine use (all/get/where/insert/update/remove).
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

export const sqlite = new DatabaseSync(join(DATA_DIR, 'relay.db'));
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    name TEXT NOT NULL,
    id   TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (name, id)
  );
`);

type Row = Record<string, any> & { id: string };

export class Collection {
  constructor(public name: string) {}

  private getStmt() {
    return sqlite.prepare('SELECT data FROM collections WHERE name = ? AND id = ?');
  }
  private allStmt() {
    return sqlite.prepare('SELECT data FROM collections WHERE name = ? ORDER BY rowid');
  }
  private insertStmt() {
    return sqlite.prepare('INSERT INTO collections (name, id, data) VALUES (?, ?, ?)');
  }
  private updateStmt() {
    return sqlite.prepare('UPDATE collections SET data = ? WHERE name = ? AND id = ?');
  }
  private deleteStmt() {
    return sqlite.prepare('DELETE FROM collections WHERE name = ? AND id = ?');
  }

  all(): Row[] {
    const rs = this.allStmt().all(this.name) as { data: string }[];
    return rs.map((r) => JSON.parse(r.data) as Row);
  }
  get(id: string): Row | undefined {
    const r = this.getStmt().get(this.name, id) as { data: string } | undefined;
    return r ? (JSON.parse(r.data) as Row) : undefined;
  }
  where(pred: (r: Row) => boolean): Row[] {
    return this.all().filter(pred);
  }
  insert(row: Row, key = 'id'): Row {
    if (row.id && this.get(row.id)) {
      throw new Error(`Duplicate ${key}: ${row.id}`);
    }
    this.insertStmt().run(this.name, row.id, JSON.stringify(row));
    return row;
  }
  update(id: string, patch: Partial<Row>): Row | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;
    const next = { ...existing, ...patch, id } as Row;
    this.updateStmt().run(this.name, id, JSON.stringify(next));
    return next;
  }
  remove(id: string): boolean {
    const res = this.deleteStmt().run(this.name, id);
    return Number(res.changes) > 0;
  }
}

export const db = {
  apps: new Collection('apps'),
  connections: new Collection('connections'),
  workflows: new Collection('workflows'),
  runs: new Collection('runs'),
  users: new Collection('users'),
  sessions: new Collection('sessions'),
  oauthstates: new Collection('oauthstates'),
};

export const uid = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
