import { useNavigate } from 'react-router-dom';

const TEMPLATES = [
  { icon: '✉️', title: 'Email new leads', desc: 'When a new row is added to a sheet, send a welcome email.', apps: 'Sheets → Mailbox', color: '#0f9d58' },
  { icon: '💬', title: 'Slack new customers', desc: 'Post to #general when a new row appears in your Leads sheet.', apps: 'Sheets → Slack', color: '#611f69' },
  { icon: '🌤️', title: 'Daily weather digest', desc: 'Get a forecast and email it to your team each morning.', apps: 'Weather → Mailbox', color: '#1e88e5' },
  { icon: '🔌', title: 'Webhook to Slack', desc: 'Forward an incoming webhook payload into a Slack channel.', apps: 'HTTP → Slack', color: '#0f172a' },
  { icon: '📊', title: 'New email → sheet row', desc: 'Log every incoming email as a row in a spreadsheet.', apps: 'Mailbox → Sheets', color: '#f97316' },
  { icon: '⏱️', title: 'Staged follow-up', desc: 'Delay then send a follow-up email after a trigger.', apps: 'Mailbox → Delay → Mailbox', color: '#64748b' },
];

export default function Templates() {
  const nav = useNavigate();
  return (
    <div>
      <h1 className="page-title">Templates</h1>
      <p className="muted" style={{ margin: '0 0 20px' }}>Start from a ready-made automation, then customize it.</p>
      <div className="grid grid-3">
        {TEMPLATES.map((t) => (
          <div key={t.title} className="card app-card">
            <div className="app-icon" style={{ background: t.color, width: 44, height: 44, fontSize: 22 }}>{t.icon}</div>
            <div className="app-name">{t.title}</div>
            <div className="app-tagline">{t.desc}</div>
            <div className="small muted mono mt8" style={{ fontSize: 11.5 }}>{t.apps}</div>
            <button className="btn btn-primary btn-sm mt16" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav('/builder')}>Use template</button>
          </div>
        ))}
      </div>
    </div>
  );
}
