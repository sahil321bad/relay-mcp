// Real Google API client: token storage, refresh, and a small typed fetch helper.
// Tokens are stored per-user (from Google OAuth) in the `users` collection.
import { db } from '../store';
import { encrypt, decrypt } from './crypto';
import type { UserRow } from './auth';

const CLIENT_ID = () => process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT = () => `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/auth/oauth/google/callback`;

export function hasGoogle(user: UserRow | null | undefined): boolean {
  return !!(user && (user.googleAccessToken || user.googleRefreshToken));
}

/** Decrypt a stored token field, tolerating legacy plaintext. */
function secret(value: string | undefined): string {
  if (!value) return '';
  try {
    return decrypt(value);
  } catch {
    return value; // legacy plaintext
  }
}

/** Return a valid access token, refreshing from the stored refresh token when needed. */
export async function ensureAccessToken(user: UserRow): Promise<string> {
  const exp = Number(user.googleExpiresAt || 0);
  if (user.googleAccessToken && exp > Date.now() + 60000) {
    const cached = secret(user.googleAccessToken);
    if (cached) return cached;
  }
  const refreshToken = secret(user.googleRefreshToken);
  if (!refreshToken) throw new Error('Connect your Google account first.');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(d.error_description || 'Google token refresh failed');
  db.users.update(user.id, {
    googleAccessToken: encrypt(d.access_token),
    googleExpiresAt: Date.now() + (d.expires_in || 3600) * 1000,
  });
  return d.access_token;
}

async function gfetch(token: string, method: string, url: string, body?: any): Promise<any> {
  const opts: any = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || data.message || `Google API error ${res.status}`);
  return data;
}

export const google = {
  gmail: {
    listMessages: (token: string, q = '', maxResults = 10) =>
      gfetch(token, 'GET', `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    getMessage: (token: string, id: string) =>
      gfetch(token, 'GET', `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`),
    send: (token: string, raw: string) =>
      gfetch(token, 'POST', 'https://gmail.googleapis.com/gmail/v1/users/me/messages', { raw }),
    createDraft: (token: string, raw: string) =>
      gfetch(token, 'POST', 'https://gmail.googleapis.com/gmail/v1/users/me/drafts', { message: { raw } }),
    modify: (token: string, id: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) =>
      gfetch(token, 'POST', `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, { addLabelIds, removeLabelIds }),
    trash: (token: string, id: string) =>
      gfetch(token, 'POST', `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`),
    listLabels: (token: string) => gfetch(token, 'GET', 'https://gmail.googleapis.com/gmail/v1/users/me/labels'),
  },
  drive: {
    listFiles: (token: string, q = '') =>
      gfetch(token, 'GET', `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType)${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    createFolder: (token: string, name: string) =>
      gfetch(token, 'POST', 'https://www.googleapis.com/drive/v3/files', { name, mimeType: 'application/vnd.google-apps.folder' }),
  },
  sheets: {
    append: (token: string, spreadsheetId: string, range: string, values: any[][]) =>
      gfetch(token, 'POST', `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`, { values }),
    read: (token: string, spreadsheetId: string, range: string) =>
      gfetch(token, 'GET', `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`),
  },
};

export { REDIRECT };
