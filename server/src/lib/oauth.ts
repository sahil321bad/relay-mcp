// Google + GitHub OAuth (server-side authorization code flow).
//
// Configure via env vars:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
//   APP_BASE_URL   (public base URL of this API, default http://localhost:3000)
//   APP_WEB_URL    (public base URL of the web app)
//
// Google login additionally grants offline access to Gmail / Drive / Sheets so the
// user's connected accounts drive the real Google integrations.
import { randomBytes } from 'node:crypto';
import { db } from '../store';

const GOOGLE_CLIENT_ID = () => process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET || '';
const GITHUB_CLIENT_ID = () => process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = () => process.env.GITHUB_CLIENT_SECRET || '';
const BASE = () => process.env.APP_BASE_URL || 'http://localhost:3000';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

export interface Profile {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  googleTokens?: { accessToken: string; refreshToken?: string; expiresAt: number; scope?: string };
}

export function isConfigured(provider: string): boolean {
  if (provider === 'google') return !!(GOOGLE_CLIENT_ID() && GOOGLE_CLIENT_SECRET());
  if (provider === 'github') return !!(GITHUB_CLIENT_ID() && GITHUB_CLIENT_SECRET());
  return false;
}

/** Detailed configuration status for a provider, including a human-readable reason. */
export function providerStatus(provider: string): { configured: boolean; reason?: string } {
  if (provider === 'google') {
    const id = GOOGLE_CLIENT_ID();
    const secret = GOOGLE_CLIENT_SECRET();
    if (id && secret) return { configured: true };
    if (!id && !secret) return { configured: false, reason: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set' };
    if (!id) return { configured: false, reason: 'GOOGLE_CLIENT_ID is not set' };
    return { configured: false, reason: 'GOOGLE_CLIENT_SECRET is not set' };
  }
  if (provider === 'github') {
    const id = GITHUB_CLIENT_ID();
    const secret = GITHUB_CLIENT_SECRET();
    if (id && secret) return { configured: true };
    if (!id && !secret) return { configured: false, reason: 'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set' };
    if (!id) return { configured: false, reason: 'GITHUB_CLIENT_ID is not set' };
    return { configured: false, reason: 'GITHUB_CLIENT_SECRET is not set' };
  }
  return { configured: false, reason: 'Unknown provider' };
}

export function listProviders() {
  return [
    { id: 'google', label: 'Continue with Google', icon: 'G', ...providerStatus('google') },
    { id: 'github', label: 'Continue with GitHub', icon: 'GH', ...providerStatus('github') },
  ];
}

export function redirectUri(provider: string): string {
  return `${BASE()}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthorizeUrl(provider: string, returnTo = ''): string {
  const state = randomBytes(16).toString('hex');
  // Persist so server restarts do not invalidate in-flight authorization flows.
  db.oauthstates.insert({ id: state, provider, exp: Date.now() + 10 * 60 * 1000, returnTo });
  if (provider === 'google') {
    const q = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID(),
      redirect_uri: redirectUri('google'),
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  const q = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID(),
    redirect_uri: redirectUri('github'),
    scope: 'read:user user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${q}`;
}

export function verifyState(state: string, provider: string): boolean {
  const entry = db.oauthstates.get(state);
  if (!entry) return false;
  return entry.provider === provider && entry.exp > Date.now();
}

export function consumeState(state: string) {
  db.oauthstates.remove(state);
}

/** Return the stored state entry without consuming it (for reading returnTo). */
export function getOAuthState(state: string) {
  return db.oauthstates.get(state);
}

async function exchangeGoogle(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number; scope?: string }> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID(),
      client_secret: GOOGLE_CLIENT_SECRET(),
      redirect_uri: redirectUri('google'),
      grant_type: 'authorization_code',
    }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(d.error_description || 'Google token exchange failed');
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token || undefined,
    expiresAt: Date.now() + (d.expires_in || 3600) * 1000,
    scope: d.scope || undefined,
  };
}

async function exchangeGithub(code: string): Promise<{ accessToken: string }> {
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID(), client_secret: GITHUB_CLIENT_SECRET(), code }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(d.error_description || 'GitHub token exchange failed');
  return { accessToken: d.access_token };
}

async function fetchGoogleProfile(accessToken: string): Promise<Profile> {
  const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Failed to fetch Google profile');
  return { provider: 'google', providerId: String(d.sub), email: d.email || '', name: d.name || 'Google user', avatar: d.picture };
}

async function fetchGithubProfile(accessToken: string): Promise<Profile> {
  const r = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}` } });
  const d = await r.json();
  if (!r.ok) throw new Error('Failed to fetch GitHub profile');
  return { provider: 'github', providerId: String(d.id), email: d.email || '', name: d.name || d.login || 'GitHub user', avatar: d.avatar_url };
}

export async function getProfile(provider: string, code: string): Promise<Profile> {
  if (provider === 'google') {
    const { accessToken, refreshToken, expiresAt, scope } = await exchangeGoogle(code);
    const profile = await fetchGoogleProfile(accessToken);
    profile.googleTokens = { accessToken, refreshToken, expiresAt, scope };
    return profile;
  }
  const { accessToken } = await exchangeGithub(code);
  return fetchGithubProfile(accessToken);
}

export function newSessionToken(): string {
  return randomBytes(24).toString('hex');
}

export function oauthDebug() {
  return {
    googleClientId: GOOGLE_CLIENT_ID(),
    googleRedirectUri: redirectUri('google'),
    githubClientId: GITHUB_CLIENT_ID(),
    githubRedirectUri: redirectUri('github'),
    baseUrl: BASE(),
    webUrl: process.env.APP_WEB_URL || 'http://localhost:4173',
    googleConfigured: isConfigured('google'),
  };
}
