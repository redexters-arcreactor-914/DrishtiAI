































// App.jsx
// ============================================================
// Main application shell.
// Sets up React Router v6, renders Sidebar + routed pages.
// Each page stub is self-contained here; replace with real
// page components as you build them out.
// ============================================================

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Sidebar from './Sidebar';
import CaseRegistration from './pages/CaseRegistration';
import SightingFeed from './pages/SightingFeed';
import MatchResults from './pages/MatchResults';
import LiveMap from './pages/LiveMap';
import CasesList from './pages/CasesList';
// ── SVG icons for page placeholders ──────────────────────────
const Icons = {
  Register: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  ),
  Sightings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Matches: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
};

// ── Reusable page placeholder ─────────────────────────────────
// Replace each one with your real page component when ready.
function PagePlaceholder({ icon: Icon, title, description, tag, children }) {
  return (
    <div className="page-placeholder animate-in">
      <div className="placeholder-icon animate-in-delay-1">
        <Icon />
      </div>
      <h1 className="placeholder-title font-display animate-in-delay-2">
        {title}
      </h1>
      <p className="placeholder-sub animate-in-delay-3">
        {description}
      </p>
      <span className="placeholder-tag animate-in-delay-4">
        {tag}
      </span>
      {children}
    </div>
  );
}

// ── Page components ───────────────────────────────────────────
// Swap these out for your real components as you build them.

// function CaseRegistration() {
//   return (
//     <PagePlaceholder
//       icon={Icons.Register}
//       title="Case Registration"
//       description="Register new missing persons cases, upload reference photos, and log initial incident details."
//       tag="READY FOR IMPLEMENTATION"
//     />
//   );
// }

// function SightingFeed() {
//   return (
//     <PagePlaceholder
//       icon={Icons.Sightings}
//       title="Sighting Feed"
//       description="Real-time feed of sighting reports. Paste raw text for AI-powered NLP extraction and structured logging."
//       tag="NLP EXTRACTOR MODULE"
//     />
//   );
// }

// function MatchResults() {
//   return (
//     <PagePlaceholder
//       icon={Icons.Matches}
//       title="Match Results"
//       description="Face matching results ranked by confidence score. DeepFace + InsightFace dual-engine output."
//       tag="FACE MATCHING MODULE"
//     />
//   );
// }

// function LiveMap() {
//   return (
//     <PagePlaceholder
//       icon={Icons.Map}
//       title="Live Map"
//       description="Geospatial visualisation of all sightings. Colour-coded by recency with timeline trail per person."
//       tag="GEOSPATIAL MODULE"
//     />
//   );
// }

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
};

function TopBar() {
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
  return (
    <>
      {/* Decorative scanline overlay */}
      <div className="scanline-container" aria-hidden="true" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="main-content" role="main">
        <TopBar />

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
