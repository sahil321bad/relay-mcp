import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Provider { id: string; label: string; icon: string; configured: boolean; reason?: string }

export default function Login() {
  const nav = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api.applyRedirectToken();
      if (res.token) return;
      try {
        const r = await api.providers();
        setProviders(r.providers);
        setDemo(r.demo);
        if (res.error) {
          const e = String(res.error);
          setError(
            e.includes('access_denied') || e.includes('blocked') || e.includes('unverified')
              ? `${e} — add your Google account under Test users in the OAuth consent screen (Google Cloud Console).`
              : e,
          );
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const oauth = (p: string) => {
    setBusy(p);
    api.oauthStart(p);
  };

  const demoLogin = async () => {
    setBusy('demo');
    try {
      await api.demoLogin();
      nav('/home');
    } catch (e: any) {
      setError(e?.message || 'Demo login failed');
      setBusy(null);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="brand" style={{ justifyContent: 'center', paddingBottom: 8 }}>
          <div className="brand-logo">R</div>
          <div style={{ textAlign: 'left' }}>
            <div className="brand-name">Relay</div>
            <div className="brand-sub">automation, powered by MCP</div>
          </div>
        </div>
        <h1 className="login-hero" style={{ marginTop: 16 }}>
          Connect everything.<br /><span>Automate anything.</span>
        </h1>
        <p className="login-sub">
          Sign in to build workflows across MCP-powered apps — email, Slack, spreadsheets, APIs and more.
        </p>

        {error && <div className="small" style={{ color: 'var(--red)', marginTop: 14 }}>{error}</div>}

        <div className="mt24" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {providers.map((p) => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button className="btn oauth-btn" disabled={!p.configured || !!busy} onClick={() => oauth(p.id)}>
                <span className="oauth-ico">{p.icon}</span>
                {p.label}
                {!p.configured && <span className="small muted" style={{ marginLeft: 'auto' }}>(not configured)</span>}
              </button>
              {!p.configured && p.reason && (
                <span className="small muted" style={{ margin: '-2px 0 6px 12px', fontSize: 11.5 }}>{p.reason}</span>
              )}
            </div>
          ))}
          {demo && (
            <button className="btn oauth-btn" disabled={!!busy} onClick={demoLogin}>
              <span className="oauth-ico">🪄</span> Continue as demo user
            </button>
          )}
        </div>

        <div className="divider mt24">or</div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
          onClick={() => nav('/login')} disabled>
          Use workspace token (API)
        </button>
        <p className="small muted" style={{ marginTop: 12 }}>
          Google/GitHub login appears only when credentials are configured (GOOGLE_CLIENT_ID / GITHUB_CLIENT_ID). The demo user always works.
        </p>
      </div>
    </div>
  );
}
