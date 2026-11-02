// Minimal authentication for the workspace API.
//
// The workspace has a single shared Bearer token. On first run it is generated
// and persisted to `data/token.json` (or you can fix it via RELAY_API_TOKEN).
// Clients obtain it by POSTing the workspace password to /api/auth/login.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { DATA_DIR } from '../store';

const TOKEN_FILE = join(DATA_DIR, 'token.json');

// Password used to "log in" and receive the token (override via RELAY_PASSWORD).
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
    /* fall through to regenerate */
  }
  const token = randomBytes(24).toString('hex');
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({ token }, null, 2));
  } catch {
    /* non-fatal: token still valid for this process */
  }
  return token;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Bearer-token gate. Mount AFTER /health and /auth/login. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (token && safeEqual(token, getWorkspaceToken())) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: a valid Bearer token is required' });
}

export function loginHandler(req: Request, res: Response) {
  const password = String(req.body?.password ?? '');
  if (!safeEqual(password, RELAY_PASSWORD)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  return res.json({ token: getWorkspaceToken(), workspace: 'demo' });
}
