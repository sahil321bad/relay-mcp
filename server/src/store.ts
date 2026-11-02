// Tiny file-backed JSON store. Collections live in server/data/*.json.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '..', 'data');

type Row = Record<string, any> & { id: string };

class Collection {
  constructor(public name: string) {}
  private file() {
    return join(DATA_DIR, `${this.name}.json`);
  }
  private read(): Row[] {
    try {
      if (!existsSync(this.file())) return [];
      return JSON.parse(readFileSync(this.file(), 'utf8'));
    } catch {
      return [];
    }
  }
  private write(rows: Row[]) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(this.file(), JSON.stringify(rows, null, 2));
  }
  all(): Row[] {
    return this.read();
  }
  get(id: string): Row | undefined {
    return this.read().find((r) => r.id === id);
  }
  where(pred: (r: Row) => boolean): Row[] {
    return this.read().filter(pred);
  }
  insert(row: Row, key = 'id'): Row {
    const rows = this.read();
    if (row.id && rows.some((r) => r[key] === row[key])) {
      throw new Error(`Duplicate ${key}: ${row[key]}`);
    }
    rows.push(row);
    this.write(rows);
    return row;
  }
  update(id: string, patch: Partial<Row>): Row | undefined {
    const rows = this.read();
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return undefined;
    rows[i] = { ...rows[i], ...patch, id };
    this.write(rows);
    return rows[i];
  }
  remove(id: string): boolean {
    const rows = this.read();
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) return false;
    this.write(next);
    return true;
  }
}

export const db = {
  apps: new Collection('apps'),
  connections: new Collection('connections'),
  workflows: new Collection('workflows'),
  runs: new Collection('runs'),
  users: new Collection('users'),
  sessions: new Collection('sessions'),
};

export const uid = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
