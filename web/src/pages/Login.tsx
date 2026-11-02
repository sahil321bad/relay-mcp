import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();

  const enter = () => {
    localStorage.setItem('relay_session', JSON.stringify({ at: Date.now() }));
    nav('/home');
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
        <div className="row" style={{ justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          {['✉️ Mailbox', '💬 Slack', '📊 Sheets', '🔌 HTTP'].map((f) => (
            <span className="badge" key={f}>{f}</span>
          ))}
        </div>
        <button className="btn btn-primary mt24" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} onClick={enter}>
          Get started →
        </button>
        <p className="small muted" style={{ marginTop: 14 }}>No sign-up — demo workspace.</p>
      </div>
    </div>
  );
}
