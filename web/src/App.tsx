import { useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { cachedUser, logout } from './api';
import { Badge } from './components/ui';
import Login from './pages/Login';
import Home from './pages/Home';
import Automations from './pages/Automations';
import Folders from './pages/Folders';
import Favorites from './pages/Favorites';
import Templates from './pages/Templates';
import Apps from './pages/Apps';
import McpServers from './pages/McpServers';
import ZapHistory from './pages/ZapHistory';
import Builder from './pages/Builder';

const hasSession = () => !!localStorage.getItem('relay_session');

const NAV = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/automations', label: 'Automations', icon: '⚡' },
  { to: '/folders', label: 'Folders', icon: '📁' },
  { to: '/favorites', label: 'Favorites', icon: '⭐' },
  { to: '/templates', label: 'Templates', icon: '🧩' },
];
const INTEGRATIONS = [
  { to: '/apps', label: 'App connections', icon: '🔌' },
  { to: '/mcp', label: 'MCP servers', icon: '🛰️', new: true },
  { to: '/history', label: 'Zap history', icon: '🕘' },
];

function Topbar() {
  const nav = useNavigate();
  const user = useMemo(() => cachedUser(), []);
  const [q, setQ] = useState('');
  const initials = (user?.name || 'D').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'D';

  return (
    <div className="topbar">
      <div className="topbar-search">
        <span className="search-ico">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) nav(`/automations?q=${encodeURIComponent(q.trim())}`); }}
          placeholder="Search assets, apps, templates, and more"
        />
        <span className="search-kbd">Ctrl K</span>
      </div>
      <div className="topbar-spacer" />
      <Link to="/apps" className="btn btn-ghost btn-sm">Explore apps</Link>
      <Link to="/templates" className="btn btn-ghost btn-sm">Templates</Link>
      <span className="btn btn-sm upgrade-pill">Upgrade</span>
      <div className="avatar" title={user?.name || 'Account'} onClick={() => { if (confirm('Sign out?')) logout(); }}>
        {initials}
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">R</div>
          <div>
            <div className="brand-name">Relay</div>
            <div className="brand-sub">automation · MCP</div>
          </div>
        </div>

        <Link to="/builder" className="btn btn-primary create-btn">+ Create</Link>

        <div className="nav-group-label">MENU</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-ico">{n.icon}</span> {n.label}
          </NavLink>
        ))}

        <div className="nav-group-label">INTEGRATIONS</div>
        {INTEGRATIONS.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-ico">{n.icon}</span> {n.label}
            {n.new && <Badge tone="blue">new</Badge>}
          </NavLink>
        ))}

        <div className="sidebar-foot">
          <div className="plan-meter">
            <div className="plan-bar"><div className="plan-fill" style={{ width: '7%' }} /></div>
            <div className="small muted mono">Plan tasks 70 / 1,000</div>
          </div>
          <button className="btn btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Manage plan</button>
        </div>
      </aside>
      <div className="main">
        <Topbar />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

function Guard({ children }: { children: React.ReactNode }) {
  return hasSession() ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={hasSession() ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/home" element={<Guard><Home /></Guard>} />
      <Route path="/automations" element={<Guard><Automations /></Guard>} />
      <Route path="/folders" element={<Guard><Folders /></Guard>} />
      <Route path="/favorites" element={<Guard><Favorites /></Guard>} />
      <Route path="/templates" element={<Guard><Templates /></Guard>} />
      <Route path="/apps" element={<Guard><Apps /></Guard>} />
      <Route path="/mcp" element={<Guard><McpServers /></Guard>} />
      <Route path="/history" element={<Guard><ZapHistory /></Guard>} />
      <Route path="/builder" element={<Guard><Builder /></Guard>} />
      <Route path="/" element={<Navigate to={hasSession() ? '/home' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={hasSession() ? '/home' : '/login'} replace />} />
    </Routes>
  );
}
