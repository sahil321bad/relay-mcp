import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Badge } from './components/ui';
import Login from './pages/Login';
import Home from './pages/Home';
import Apps from './pages/Apps';
import Workflows from './pages/Workflows';
import Runs from './pages/Runs';
import Builder from './pages/Builder';

const hasSession = () => !!localStorage.getItem('relay_session');

const NAV = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/apps', label: 'Apps', icon: '🧩' },
  { to: '/workflows', label: 'Workflows', icon: '⚡' },
  { to: '/builder', label: 'Builder', icon: '🧱' },
  { to: '/runs', label: 'Runs', icon: '📜' },
];

function TitleFor(path: string) {
  const map: Record<string, string> = {
    '/home': 'Home', '/apps': 'Apps', '/workflows': 'Workflows',
    '/builder': 'Workflow builder', '/runs': 'Runs & logs',
  };
  return map[path] ?? 'Relay';
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
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-ico">{n.icon}</span> {n.label}
          </NavLink>
        ))}
        <div className="sidebar-foot">Demo workspace · local MCP servers</div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{TitleFor(loc.pathname)}</div>
          <div className="topbar-spacer" />
          <Badge tone="green" dot>connected</Badge>
        </div>
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
      <Route path="/apps" element={<Guard><Apps /></Guard>} />
      <Route path="/workflows" element={<Guard><Workflows /></Guard>} />
      <Route path="/runs" element={<Guard><Runs /></Guard>} />
      <Route path="/builder" element={<Guard><Builder /></Guard>} />
      <Route path="/" element={<Navigate to={hasSession() ? '/home' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={hasSession() ? '/home' : '/login'} replace />} />
    </Routes>
  );
}
