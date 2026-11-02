// Real Google tool implementations, keyed by step id (as used in the workflow
// engine). Each receives the authed user and resolved arguments and returns a
// plain object that becomes the step output.
import type { UserRow } from './auth';
import { ensureAccessToken, google } from './google';

function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function buildRawMessage(args: any): string {
  const to = args.to || '';
  const subject = args.subject || '';
  const body = args.body || '';
  // No `From` header: Gmail sets the sender from the authenticated account.
  const headers = [`To: ${to}`, `Subject: ${subject}`, `Date: ${new Date().toUTCString()}`];
  if (args.cc) headers.push(`Cc: ${args.cc}`);
  return b64url(headers.join('\r\n') + '\r\n\r\n' + body);
}

function parseHeaders(message: any) {
  const h: any = {};
  for (const header of message.payload?.headers || []) {
    if (header.name === 'From') h.from = header.value;
    if (header.name === 'Subject') h.subject = header.value;
  }
  return h;
}

async function labelId(token: string, name: string): Promise<string> {
  const labels = await google.gmail.listLabels(token);
  const found = (labels.labels || []).find((l: any) => l.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  throw new Error(`Gmail label "${name}" not found`);
}

function valuesFromArgs(args: any): any[][] {
  if (Array.isArray(args.values)) return args.values;
  let obj = args.values;
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch { obj = null; }
  }
  if (obj && typeof obj === 'object') return [Object.values(obj)];
  if (typeof obj === 'string') return [obj.split(',').map((s) => s.trim())];
  return [[String(args.values ?? '')]];
}

export const googleTools: Record<string, (user: UserRow, args: any) => Promise<any>> = {
  async 'gmail.send_email'(user, args) {
    const token = await ensureAccessToken(user);
    const raw = buildRawMessage(args);
    const res = await google.gmail.send(token, raw);
    return { ok: true, messageId: res.id };
  },
  async 'gmail.create_draft'(user, args) {
    const token = await ensureAccessToken(user);
    const raw = buildRawMessage(args);
    const res = await google.gmail.createDraft(token, raw);
    return { ok: true, draftId: res.id };
  },
  async 'gmail.add_label'(user, args) {
    const token = await ensureAccessToken(user);
    const id = await labelId(token, args.label);
    const res = await google.gmail.modify(token, args.messageId, [id]);
    return { ok: true, labelIds: res.labelIds };
  },
  async 'gmail.archive'(user, args) {
    const token = await ensureAccessToken(user);
    await google.gmail.modify(token, args.messageId, [], ['INBOX']);
    return { ok: true, archived: true };
  },
  async 'gmail.delete'(user, args) {
    const token = await ensureAccessToken(user);
    await google.gmail.trash(token, args.messageId);
    return { ok: true, trashed: true };
  },
  async 'gmail.new_email'(user, args) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listMessages(token, args.query || 'in:inbox', 10);
    const emails = [];
    for (const m of list.messages || []) {
      const full = await google.gmail.getMessage(token, m.id);
      const h = parseHeaders(full);
      emails.push({ id: full.id, threadId: full.threadId, from: h.from, subject: h.subject, snippet: full.snippet || '' });
    }
    return { emails, count: emails.length };
  },
  async 'drive.list_files'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.listFiles(token, args.query || '');
    return { files: res.files || [] };
  },
  async 'drive.create_folder'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.createFolder(token, args.name);
    return { id: res.id, name: res.name, mimeType: res.mimeType };
  },
  async 'sheets.append_row'(user, args) {
    const token = await ensureAccessToken(user);
    const range = args.range || 'Sheet1!A1';
    const res = await google.sheets.append(token, args.spreadsheetId, range, valuesFromArgs(args));
    return { ok: true, updatedRows: res.updates?.updatedRows ?? 1, spreadsheetId: args.spreadsheetId, range };
  },
  async 'sheets.read_range'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.sheets.read(token, args.spreadsheetId, args.range || 'Sheet1!A1:C10');
    return { values: res.values || [] };
  },
};
