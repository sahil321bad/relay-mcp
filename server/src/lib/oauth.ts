// Google + GitHub OAuth (server-side authorization code flow).
//
// Configure via env vars:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
//   APP_BASE_URL        (public base URL of this API, default http://localhost:3000)
//
// When a provider's credentials are missing, that provider reports `configured:false`
// and the app falls back to its built-in "demo" sign-in so it stays usable.
import { randomBytes } from 'node:crypto';

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';

export interface ProviderConfig {
  id: 'google' | 'github';
  label: string;
  icon: string;
  configured: boolean;
}

function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
function githubConfigured() {
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function listProviders(): ProviderConfig[] {
  return [
    { id: 'google', label: 'Continue with Google', icon: 'G', configured: googleConfigured() },
    { id: 'github', label: 'Continue with GitHub', icon: 'GH', configured: githubConfigured() },
  ];
}

function redirectUri(provider: string) {
  return `${BASE}/api/auth/oauth/${provider}/callback`;
}

export function isConfigured(provider: string): boolean {
  return provider === 'google' ? googleConfigured() : githubConfigured();
}

// ---------------------------------------------------------------------------
// OAuth CSRF protection: random `state` values issued per flow, verified in the
// callback before the authorization code is exchanged.
// ---------------------------------------------------------------------------
const oauthStates = new Map<string, { provider: string; exp: number }>();
const STATE_TTL_MS = 10 * 60 * 1000;

function createState(provider: string): string {
  const s = randomBytes(16).toString('hex');
  oauthStates.set(s, { provider, exp: Date.now() + STATE_TTL_MS });
  return s;
}

export function verifyState(state: string, provider: string): boolean {
  const entry = oauthStates.get(state);
  if (!entry) return false;
  return entry.provider === provider && entry.exp > Date.now();
}

/** Delete a state entry after the OAuth handshake completes (single-use). */
export function consumeState(state: string) {
  oauthStates.delete(state);
}

export function buildAuthorizeUrl(provider: string): string {
  const state = createState(provider);
  if (provider === 'google') {
    const q = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri('google'),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  const q = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: redirectUri('github'),
    scope: 'read:user user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${q}`;
}

async function exchangeCode(provider: string, code: string): Promise<{ accessToken: string }> {
  if (provider === 'google') {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri('google'),
        grant_type: 'authorization_code',
        code,
      }),
    });
    const data = (await res.json()) as any;
    if (!res.ok || !data.access_token) throw new Error(data.error_description || 'Google token exchange failed');
    return { accessToken: data.access_token };
  }
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      redirect_uri: redirectUri('github'),
      code,
    }),
  });
  const data = (await res.json()) as any;
  if (!res.ok || !data.access_token) throw new Error(data.error_description || 'GitHub token exchange failed');
  return { accessToken: data.access_token };
}

export interface Profile {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

async function fetchProfile(provider: string, accessToken: string): Promise<Profile> {
  if (provider === 'google') {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error('Failed to fetch Google profile');
    return {
      provider: 'google',
      providerId: String(data.id),
      email: data.email || '',
      name: data.name || data.email || 'Google user',
      avatar: data.picture,
    };
  }
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
  });
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error('Failed to fetch GitHub profile');
  return {
    provider: 'github',
    providerId: String(data.id),
    email: data.email || '',
    name: data.name || data.login || 'GitHub user',
    avatar: data.avatar_url,
  };
}

export async function getProfile(provider: string, code: string): Promise<Profile> {
  const { accessToken } = await exchangeCode(provider, code);
  return fetchProfile(provider, accessToken);
}

export function newSessionToken(): string {
  return randomBytes(24).toString('hex');
}
