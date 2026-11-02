// Real Google tool implementations, keyed by step id (matching google-catalog).
// Each receives the authed user and resolved arguments and returns a plain object
// that becomes the step output.
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

// Build a reply to an existing message (In-Reply-To / References / Re: subject).
async function buildReplyRaw(token: string, args: any): Promise<string> {
  let to = args.to || '';
  let subject = args.subject || '';
  let extra = '';
  if (args.messageId) {
    const orig = await google.gmail.getMessageFull(token, args.messageId);
    const h = parseHeaders(orig);
    if (!to && h.from) to = h.from;
    if (!subject) subject = h.subject && !/^re:\s*/i.test(h.subject) ? `Re: ${h.subject}` : h.subject || 'Re: ';
    const refs = [h.references, h.inReplyTo].filter(Boolean).join(' ');
    if (h.inReplyTo) extra += `In-Reply-To: ${h.inReplyTo}\r\n`;
    if (refs) extra += `References: ${refs}\r\n`;
  }
  const headers = [`To: ${to}`, `Subject: ${subject}`, `Date: ${new Date().toUTCString()}`];
  if (extra) headers.push(extra.trim());
  return b64url(headers.join('\r\n') + '\r\n\r\n' + (args.body || ''));
}

async function buildForwardRaw(token: string, args: any): Promise<string> {
  const orig = args.originalMessageId ? await google.gmail.getMessageFull(token, args.originalMessageId) : null;
  const h = orig ? parseHeaders(orig) : {};
  const subject = args.subject || `Fwd: ${h.subject || '(no subject)'}`;
  const headers = [`To: ${args.to}`, `Subject: ${subject}`, `Date: ${new Date().toUTCString()}`];
  const quoted = orig
    ? `\r\n\r\n----- Original Message -----\r\nFrom: ${h.from || ''}\r\nSubject: ${h.subject || ''}\r\n\r\n${orig.snippet || ''}`
    : '';
  return b64url(headers.join('\r\n') + '\r\n\r\n' + (args.body || '') + quoted);
}

function parseHeaders(message: any) {
  const h: any = {};
  for (const header of message.payload?.headers || []) {
    const name = header.name;
    const value = header.value;
    if (name === 'From') h.from = value;
    else if (name === 'To') h.to = value;
    else if (name === 'Subject') h.subject = value;
    else if (name === 'Message-ID') h.messageId = value;
    else if (name === 'In-Reply-To') h.inReplyTo = value;
    else if (name === 'References') h.references = value;
  }
  return h;
}

function msgSummary(full: any) {
  const h = parseHeaders(full);
  return { id: full.id, threadId: full.threadId, from: h.from, to: h.to, subject: h.subject, snippet: full.snippet || '' };
}

async function labelId(token: string, name: string): Promise<string> {
  const res = await google.gmail.listLabels(token);
  const found = (res.labels || []).find((l: any) => l.name === name || l.id === name);
  if (found) return found.id;
  throw new Error(`Gmail label "${name}" not found`);
}

function settleAttachments(payload: any, out: any[]) {
  if (!payload) return;
  if (payload.filename && payload.body?.attachmentId) {
    out.push({ filename: payload.filename, mimeType: payload.mimeType, size: payload.body.size || 0 });
  }
  for (const part of payload.parts || []) settleAttachments(part, out);
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
  // ------------------------------------------------------------------ Gmail
  async 'gmail.send_email'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.gmail.send(token, buildRawMessage(args));
    return { ok: true, messageId: res.id };
  },
  async 'gmail.create_draft'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.gmail.createDraft(token, buildRawMessage(args));
    return { ok: true, draftId: res.id };
  },
  async 'gmail.create_draft_reply'(user, args) {
    const token = await ensureAccessToken(user);
    const raw = await buildReplyRaw(token, args);
    const res = await google.gmail.createDraft(token, raw);
    return { ok: true, draftId: res.id };
  },
  async 'gmail.reply_email'(user, args) {
    const token = await ensureAccessToken(user);
    const raw = await buildReplyRaw(token, args);
    const res = await google.gmail.send(token, raw);
    return { ok: true, messageId: res.id };
  },
  async 'gmail.forward_email'(user, args) {
    const token = await ensureAccessToken(user);
    const raw = await buildForwardRaw(token, args);
    const res = await google.gmail.send(token, raw);
    return { ok: true, messageId: res.id };
  },
  async 'gmail.delete'(user, args) {
    const token = await ensureAccessToken(user);
    await google.gmail.trash(token, args.messageId);
    return { ok: true, trashed: true };
  },
  async 'gmail.archive'(user, args) {
    const token = await ensureAccessToken(user);
    await google.gmail.modify(token, args.messageId, [], ['INBOX']);
    return { ok: true, archived: true };
  },
  async 'gmail.add_label'(user, args) {
    const token = await ensureAccessToken(user);
    const id = await labelId(token, args.label);
    const res = await google.gmail.modify(token, args.messageId, [id]);
    return { ok: true, labelIds: res.labelIds };
  },
  async 'gmail.remove_label_email'(user, args) {
    const token = await ensureAccessToken(user);
    const id = await labelId(token, args.label);
    await google.gmail.modify(token, args.messageId, [], [id]);
    return { ok: true };
  },
  async 'gmail.remove_label_conversation'(user, args) {
    const token = await ensureAccessToken(user);
    const id = await labelId(token, args.label);
    const thread = await google.gmail.getThread(token, args.threadId);
    const msgs = thread.messages || [];
    for (const m of msgs) await google.gmail.modify(token, m.id, [], [id]);
    return { ok: true, updated: msgs.length };
  },
  async 'gmail.create_label'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.gmail.createLabel(token, args.name);
    return { ok: true, labelId: res.id, name: res.name };
  },
  async 'gmail.find_email'(user, args) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listMessages(token, args.query || 'in:inbox', 5);
    if (!list.messages?.length) return { found: false };
    const full = await google.gmail.getMessageFull(token, list.messages[0].id);
    const s = msgSummary(full);
    return { found: true, ...s };
  },
  async 'gmail.get_conversation'(user, args) {
    const token = await ensureAccessToken(user);
    const t = await google.gmail.getThread(token, args.threadId);
    return { id: t.id, historyId: t.historyId, messages: (t.messages || []).map(msgSummary) };
  },
  async 'gmail.get_attachment'(user, args) {
    const token = await ensureAccessToken(user);
    const full = await google.gmail.getMessageFull(token, args.messageId);
    const walk = (p: any): any => {
      if (!p) return null;
      if (p.filename && p.filename === args.filename) return p;
      for (const part of p.parts || []) {
        const r = walk(part);
        if (r) return r;
      }
      return null;
    };
    const part = walk(full.payload);
    if (!part) return { found: false };
    return { found: true, filename: part.filename, mimeType: part.mimeType, size: part.body?.size || 0, attachmentId: part.body?.attachmentId || null };
  },
  async 'gmail.new_email'(user, args) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listMessages(token, args.query || 'in:inbox', 10);
    const emails = [];
    for (const m of list.messages || []) {
      const full = await google.gmail.getMessageFull(token, m.id);
      emails.push(msgSummary(full));
    }
    return { emails, count: emails.length };
  },
  async 'gmail.new_email_search'(user, args) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listMessages(token, args.query || 'in:inbox', 10);
    const emails = [];
    for (const m of list.messages || []) {
      const full = await google.gmail.getMessageFull(token, m.id);
      emails.push(msgSummary(full));
    }
    return { emails, count: emails.length };
  },
  async 'gmail.new_labeled_email'(user, args) {
    const token = await ensureAccessToken(user);
    const q = `label:${args.label}`;
    const list = await google.gmail.listMessages(token, q, 10);
    const emails = [];
    for (const m of list.messages || []) {
      const full = await google.gmail.getMessageFull(token, m.id);
      emails.push(msgSummary(full));
    }
    return { emails, count: emails.length };
  },
  async 'gmail.new_starred_email'(user) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listMessages(token, 'is:starred newer_than:2d', 10);
    const emails = [];
    for (const m of list.messages || []) {
      const full = await google.gmail.getMessageFull(token, m.id);
      emails.push(msgSummary(full));
    }
    return { emails, count: emails.length };
  },
  async 'gmail.new_conversation'(user, args) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listThreads(token, args.query || 'in:inbox', 10);
    return { conversations: (list.threads || []), count: (list.threads || []).length };
  },
  async 'gmail.new_labeled_conversation'(user, args) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listThreads(token, `label:${args.label}`, 10);
    return { conversations: (list.threads || []), count: (list.threads || []).length };
  },
  async 'gmail.new_attachment'(user, args) {
    const token = await ensureAccessToken(user);
    const list = await google.gmail.listMessages(token, args.query || 'in:inbox', 10);
    const out = [];
    for (const m of list.messages || []) {
      const full = await google.gmail.getMessageFull(token, m.id);
      const atts: any[] = [];
      settleAttachments(full.payload, atts);
      if (atts.length) {
        const h = parseHeaders(full);
        out.push({ id: full.id, threadId: full.threadId, from: h.from, subject: h.subject, attachments: atts });
      }
    }
    return { emails: out, count: out.length };
  },
  async 'gmail.new_label'(user) {
    const token = await ensureAccessToken(user);
    const res = await google.gmail.listLabels(token);
    return { labels: res.labels || [], count: (res.labels || []).length };
  },

  // ------------------------------------------------------------------ Drive
  async 'drive.new_file'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.newFiles(token, args.query || '');
    return { files: res.files || [], count: (res.files || []).length };
  },
  async 'drive.list_files'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.listFiles(token, args.query || '');
    return { files: res.files || [] };
  },
  async 'drive.create_file'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.createFile(token, args.name, args.mimeType || 'text/plain', args.content || '');
    return { id: res.id, name: res.name, mimeType: res.mimeType };
  },
  async 'drive.create_folder'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.createFolder(token, args.name);
    return { id: res.id, name: res.name, mimeType: res.mimeType };
  },
  async 'drive.copy_file'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.copyFile(token, args.fileId, args.name);
    return { id: res.id, name: res.name, mimeType: res.mimeType };
  },
  async 'drive.get_file'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.getFile(token, args.fileId);
    return res;
  },
  async 'drive.search_file'(user, args) {
    const token = await ensureAccessToken(user);
    const res = await google.drive.listFiles(token, args.query);
    return { files: res.files || [] };
  },
  async 'drive.move_file'(user, args) {
    const token = await ensureAccessToken(user);
    await google.drive.update(token, args.fileId, { parents: [args.folderId] });
    return { ok: true, moved: true };
  },
  async 'drive.trash_file'(user, args) {
    const token = await ensureAccessToken(user);
    await google.drive.trash(token, args.fileId);
    return { ok: true, trashed: true };
  },

  // ------------------------------------------------------------- Sheets (keep)
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
