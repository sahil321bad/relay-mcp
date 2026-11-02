// Authentication for the Relay API.
//
// Two credential types are accepted on /api routes (except /health & /auth/*):
//   1. The workspace Bearer token (for headless/API access).
//   2. A user session token obtained via /api/auth/login, /api/auth/demo or OAuth.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { db, uid, DATA_DIR } from '../store';
import { encrypt } from './crypto';
import type { Profile } from './oauth';

const TOKEN_FILE = join(DATA_DIR, 'token.json');

export const RELAY_PASSWORD = process.env.RELAY_PASSWORD || 'relay-demo';

export function getWorkspaceToken(): string {
  const fromEnv = process.env.RELAY_API_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    if (existsSync(TOKEN_FILE)) {
      const parsed = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (parsed?.token) return parsed.token;
    }
  } catch {
    /* regenerate below */
  }
  const token = randomBytes(24).toString('hex');
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({ token }, null, 2));
  } catch {
    /* non-fatal */
  }
  return token;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------
export interface UserRow {
  id: string;
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleExpiresAt?: number;
}

export function sanitizeUser(u: UserRow): UserRow {
  const { googleAccessToken, googleRefreshToken, googleExpiresAt, ...rest } = u;
  return rest as UserRow;
}

export function findOrCreateUser(profile: Profile): UserRow {
  const existing = db.users.where((u) => u.provider === profile.provider && u.providerId === profile.providerId)[0];
  const googlePatch: Partial<UserRow> = {};
  if (profile.googleTokens) {
    googlePatch.googleAccessToken = encrypt(profile.googleTokens.accessToken);
    if (profile.googleTokens.refreshToken) googlePatch.googleRefreshToken = encrypt(profile.googleTokens.refreshToken);
    googlePatch.googleExpiresAt = profile.googleTokens.expiresAt;
  }
  if (existing) {
    if (Object.keys(googlePatch).length) db.users.update(existing.id, googlePatch);
    // Re-read so the returned object reflects persisted (encrypted) state.
    return sanitizeUser((db.users.get(existing.id) as UserRow) ?? existing);
  }
  const user: UserRow = {
    id: uid('user'),
    provider: profile.provider,
    providerId: profile.providerId,
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
    createdAt: new Date().toISOString(),
    ...googlePatch,
  };
  db.users.insert(user);
  return sanitizeUser(user);
}

export function issueSessionToken(user: UserRow): string {
  const token = randomBytes(24).toString('hex');
  db.sessions.insert({ id: `sess_${token}`, token, userId: user.id, createdAt: new Date().toISOString() });
  return token;
}

// ---------------------------------------------------------------------------
// One-time authorization codes: used to hand a session to the browser via a
// redirect without ever putting the session token in the URL. The code is
// short-lived and single-use; the browser POSTs it back for the real token.
// ---------------------------------------------------------------------------
const oneTimeCodes = new Map<string, { userId: string; exp: number }>();
const CODE_TTL_MS = 60 * 1000;

export function issueOneTimeCode(userId: string): string {
  const code = randomBytes(18).toString('base64url');
  oneTimeCodes.set(code, { userId, exp: Date.now() + CODE_TTL_MS });
  return code;
}

export function exchangeOneTimeCode(code: string): UserRow | null {
  const entry = oneTimeCodes.get(code);
  if (!entry) return null;
  oneTimeCodes.delete(code); // single-use
  if (entry.exp < Date.now()) return null;
  const user = db.users.get(entry.userId);
  return user ? (user as UserRow) : null;
}

export function userFromToken(token: string): UserRow | null {
  const sess = db.sessions.where((s) => s.token === token)[0];
  if (!sess) return null;
  const user = db.users.get(sess.userId);
  return user ? (user as UserRow) : null;
}

// ---------------------------------------------------------------------------
// Middleware / handlers
// ---------------------------------------------------------------------------
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized: a valid Bearer token is required' });

  if (safeEqual(token, getWorkspaceToken())) {
    (req as any).user = { id: 'workspace', provider: 'workspace', name: 'Workspace', email: '' };
    return next();
  }
  const user = userFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized: invalid session' });
  (req as any).user = user;
  (req as any).sessionToken = token;
  return next();
}

export function loginHandler(req: Request, res: Response) {
  const password = String(req.body?.password ?? '');
  if (!safeEqual(password, RELAY_PASSWORD)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  // Workspace login → return the workspace token (headless/client use).
  return res.json({ token: getWorkspaceToken(), user: { id: 'workspace', name: 'Workspace' } });
}

export function demoHandler(_req: Request, res: Response) {
  const user = findOrCreateUser({
    provider: 'demo',
    providerId: 'demo',
    email: 'demo@relay.local',
    name: 'Demo User',
    avatar: undefined,
  });
  const token = issueSessionToken(user);
  return res.json({ token, user: sanitizeUser(user) });
}

export function meHandler(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  return res.json({ user: sanitizeUser(user as UserRow) });
}
