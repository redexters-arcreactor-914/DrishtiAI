// Sidebar.jsx
// ============================================================
// Fixed left sidebar with branding, navigation, status, footer.
// Uses React Router v6 NavLink for active-state detection.
// ============================================================

import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

// ── SVG Icons (inline, no external deps) ─────────────────────
const IconRegister = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
);

const IconSightings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="2" x2="12" y2="4"/>
    <line x1="12" y1="20" x2="12" y2="22"/>
  </svg>
);

const IconMatches = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
    <path d="M8 11h6M11 8v6"/>
  </svg>
);

const IconMap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);

const IconCases = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconShield = (props) => (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ── Nav items config ──────────────────────────────────────────
const NAV_ITEMS = [
  {
    to: '/',
    label: 'Case Registration',
    Icon: IconRegister,
    badge: null,
    end: true,   // exact match for root
  },
  {
    to: '/cases',
    label: 'Cases',
    Icon: IconCases,
    badge: null,
    end: false,
  },
  {
    to: '/sightings',
    label: 'Sighting Feed',
    Icon: IconSightings,
    badge: null,
    end: false,
  },
  {
    to: '/matches',
    label: 'Match Results',
    Icon: IconMatches,
    badge: null,
    end: false,
  },
  {
    to: '/map',
    label: 'Live Map',
    Icon: IconMap,
    badge: null,
    end: false,
  },
];

// ── Live clock hook ───────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      return now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      }) + ' IST';
    };
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ── Component ─────────────────────────────────────────────────
export default function Sidebar({ health }) {
  const clock = useClock();
  const online = !!health;
  const statusText = health === null || health === undefined
    ? 'CONNECTING…'
    : online ? 'SYSTEMS NOMINAL' : 'BACKEND OFFLINE';

  return (
    <aside className="sidebar noise" aria-label="Primary navigation">

      {/* ── Brand ──────────────────────────────────────────── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-eyebrow">
          DrishtiAI
        </div>
        <div className="sidebar-brand-title">
          MISSING<br />
          PERSONS <span>AI</span>
        </div>
        <div className="sidebar-brand-sub">
          NATIONAL TRACKING NETWORK
        </div>

        {/* Live status */}
        <div className="sidebar-status" role="status" aria-live="polite">
          <div
            className="sidebar-status-dot"
            aria-hidden="true"
            style={online ? undefined : { background: health === false ? '#e63946' : '#8888aa', boxShadow: 'none' }}
          />
          <span className="sidebar-status-text" style={online ? undefined : { color: health === false ? '#e63946' : '#8888aa' }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="sidebar-nav" aria-label="Site sections">
        <div className="sidebar-section-label" aria-hidden="true">
          Modules
        </div>

        {NAV_ITEMS.map(({ to, label, Icon, badge, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="nav-item-icon" aria-hidden="true">
                  <Icon />
                </div>
                <div className="nav-item-content">
                  <span className="nav-item-label">{label}</span>
                </div>
                {badge && (
                  <span className="nav-item-badge" aria-label={`${badge} new`}>
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'var(--border-subtle)',
            margin: '12px 8px',
          }}
          aria-hidden="true"
        />

        <div className="sidebar-section-label" aria-hidden="true">
          System
        </div>

        {/* Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
          }}
          aria-label={`Current time: ${clock}`}
        >
          <div
            className="nav-item-icon"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, color: 'var(--text-muted)' }}>
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            {clock || '——:——:——'}
          </span>
        </div>

        {/* Version */}
        <div
          style={{
            padding: '4px 12px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}
        >
          BUILD v0.1.0-alpha
        </div>
      </nav>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="sidebar-footer" aria-label="Access warning">
        <div className="sidebar-footer-warning" role="alert">
          <IconShield aria-hidden="true" style={{ width: 10, height: 10 }} />
          FOR AUTHORIZED USE ONLY
        </div>
        <div className="sidebar-footer-meta">
          DRISHTI AI · PROTOTYPE
        </div>
      </footer>
    </aside>
  );
}
