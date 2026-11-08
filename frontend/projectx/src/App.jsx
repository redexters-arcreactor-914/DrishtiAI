// App.jsx
// ============================================================
// Main application shell: Sidebar + top bar + routed pages.
// ============================================================

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api';
import Sidebar from './Sidebar';
import CaseRegistration from './pages/CaseRegistration';
import SightingFeed from './pages/SightingFeed';
import MatchResults from './pages/MatchResults';
import LiveMap from './pages/LiveMap';
import CasesList from './pages/CasesList';
function NotFound() {
  return (
    <div className="page-placeholder animate-in">
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '72px',
          fontWeight: 700,
          color: 'var(--accent)',
          opacity: 0.3,
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1 className="placeholder-title font-display">Page Not Found</h1>
      <p className="placeholder-sub">
        This route doesn't exist in the system. Navigate using the sidebar.
      </p>
    </div>
  );
}

// ── Top bar ────────────────────────────────────────────────────
// Shows current route name, live timestamp, operator badge.
const ROUTE_NAMES = {
  '/':          'Case Registration',
  '/sightings': 'Sighting Feed',
  '/matches':   'Match Results',
  '/map':       'Live Map',
  '/cases':     'Cases',
};

// Polls /api/health so the UI shows when the backend is down.
function useBackendHealth(intervalMs = 15000) {
  const [health, setHealth] = useState(null); // null = unknown, false = down
  useEffect(() => {
    let alive = true;
    const check = () => api.health()
      .then(h => alive && setHealth(h))
      .catch(() => alive && setHealth(false));
    check();
    const id = setInterval(check, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [intervalMs]);
  return health;
}

function TopBar({ health }) {
  const location = useLocation();
  const [date, setDate] = useState('');

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
    setDate(fmt());
    // Date won't change within a session but refresh at midnight
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    const id = setTimeout(() => setDate(fmt()), msUntilMidnight);
    return () => clearTimeout(id);
  }, []);

  const routeName = ROUTE_NAMES[location.pathname] ?? 'Unknown';

  return (
    <header className="topbar" role="banner">
      {/* Breadcrumb */}
      <div className="topbar-route" aria-label="Current section">
        <span
          className="topbar-route-slash"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
        >
          /
        </span>
        <span className="topbar-route-name font-display">
          {routeName}
        </span>
      </div>

      {/* Right side */}
      <div className="topbar-right">
        <time
          className="topbar-time"
          dateTime={new Date().toISOString().split('T')[0]}
          aria-label={`Today's date: ${date}`}
        >
          {date}
        </time>

        {/* Backend status */}
        <span
          title={health ? `Face engines: ${(health.face_engines || []).join(', ') || 'none'} · NLP: ${health.gemini_configured ? 'Gemini' : 'offline rules'}` : 'Backend unreachable'}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
            padding: '3px 8px', borderRadius: 4,
            color: health ? '#22c55e' : health === false ? '#e63946' : '#8888aa',
            border: `1px solid ${health ? 'rgba(34,197,94,0.3)' : health === false ? 'rgba(230,57,70,0.4)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {health ? 'API ONLINE' : health === false ? 'API OFFLINE' : 'API …'}
        </span>

        {/* Operator badge */}
        <div
          className="topbar-operator"
          role="button"
          tabIndex={0}
          aria-label="Operator: Admin"
          title="Logged in as Admin"
        >
          <div className="topbar-operator-avatar" aria-hidden="true">
            OP
          </div>
          <span className="topbar-operator-label">ADMIN</span>
        </div>
      </div>
    </header>
  );
}

// ── Inner layout (needs router context for useLocation) ───────
function AppLayout() {
  const health = useBackendHealth();
  return (
    <>
      {/* Decorative scanline overlay */}
      <div className="scanline-container" aria-hidden="true" />

      {/* Sidebar */}
      <Sidebar health={health} />

      {/* Main area */}
      <div className="main-content" role="main">
        <TopBar health={health} />

        <div className="page-container">
          <Routes>
            <Route path="/"          element={<CaseRegistration />} />
            <Route path="/cases"     element={<CasesList />} />
            <Route path="/sightings" element={<SightingFeed />} />
            <Route path="/matches"   element={<MatchResults />} />
            <Route path="/map"       element={<LiveMap />} />
            <Route path="*"          element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

// ── Root export ───────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
