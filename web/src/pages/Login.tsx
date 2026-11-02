import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enter = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      nav('/home');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
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
          Build workflows that trigger on events and run actions across MCP-powered apps —
          email, Slack, spreadsheets, APIs and more.
        </p>

        <form onSubmit={enter} className="mt24" style={{ textAlign: 'left' }}>
          <div className="field">
            <label className="field-label">Workspace password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="demo: relay-demo"
              autoFocus
            />
            <span className="field-help">Demo workspace password is <b>relay-demo</b> (override via RELAY_PASSWORD).</span>
          </div>
          {error && <div className="small" style={{ color: 'var(--red)', marginBottom: 10 }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}
