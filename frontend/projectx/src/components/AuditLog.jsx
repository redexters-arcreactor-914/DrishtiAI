




import { useState, useEffect, useRef } from "react";

const REFRESH_INTERVAL = 30_000; // 30 seconds

/** Returns true if an action string is a "reveal" type event */
function isRevealAction(action = "") {
  const keywords = ["reveal", "identify", "expose", "unmasked", "id confirmed"];
  return keywords.some((kw) => action.toLowerCase().includes(kw));
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts ?? "--:--:--";
  }
}

function CountdownBar({ interval, lastFetch }) {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - lastFetch;
      setPct(Math.max(0, 100 - (elapsed / interval) * 100));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [lastFetch, interval]);

  return (
    <div className="w-full h-0.5 overflow-hidden" style={{ background: "#1a1a24" }}>
      <div
        className="h-full transition-none"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #7a1520, #e63946)",
        }}
      />
    </div>
  );
}

function AuditEntry({ entry, index }) {
  const reveal = isRevealAction(entry.action);

  return (
    <li
      className="px-4 py-3 border-b flex flex-col gap-1 transition-colors duration-200"
      style={{
        borderColor: "#111118",
        background: reveal
          ? `rgba(230,57,70,${0.04 + (index === 0 ? 0.06 : 0)})`
          : "transparent",
        animationName: index === 0 ? "slideIn" : "none",
        animationDuration: "0.35s",
        animationTimingFunction: "ease-out",
        animationFillMode: "both",
      }}
    >
      {/* Top row: action + badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-bold tracking-wide truncate"
          style={{ color: reveal ? "#e63946" : "#c0c0d0" }}
        >
          {entry.action ?? "Unknown Action"}
        </span>
        {reveal && (
          <span
            className="flex-none text-[9px] tracking-widest uppercase px-1.5 py-0.5 border"
            style={{
              borderColor: "#e63946",
              color: "#e63946",
              background: "rgba(230,57,70,0.12)",
            }}
          >
            Reveal
          </span>
        )}
      </div>

      {/* Bottom row: user + timestamp */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] tracking-wide"
          style={{ color: reveal ? "#a02030" : "#404058" }}
        >
          {entry.user ?? "Unknown"}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "#2e2e42" }}>
          {formatTime(entry.timestamp)}
        </span>
      </div>
    </li>
  );
}

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef(null);

  const fetchAudit = async (isAuto = false) => {
    try {
      if (isAuto) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/audit");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Accept array directly or { entries: [] } shape
      const raw = Array.isArray(data) ? data : (data.entries ?? []);
      setEntries(raw.slice(0, 10));
      setLastFetch(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAudit();
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => fetchAudit(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const revealCount = entries.filter((e) => isRevealAction(e.action)).length;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
      `}</style>

      <aside
        className="flex flex-col w-72 h-full overflow-hidden border-l"
        style={{
          background: "#0a0a0f",
          borderColor: "#1a1a24",
          fontFamily: "'Courier New', Courier, monospace",
          minHeight: 0,
        }}
      >
        {/* ── Panel Header ── */}
        <div
          className="flex-none px-4 py-3 border-b flex flex-col gap-2"
          style={{ background: "#0d0d14", borderColor: "#1a1a24" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#e63946",
                  animationName: "pulseDot",
                  animationDuration: "2s",
                  animationIterationCount: "infinite",
                  display: "inline-block",
                }}
              />
              <h2 className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: "#e63946" }}>
                Audit Log
              </h2>
            </div>
            <button
              onClick={() => fetchAudit()}
              title="Refresh now"
              className="text-[10px] tracking-widest uppercase px-2 py-0.5 border transition-colors"
              style={{
                borderColor: "#2a2a3a",
                color: "#4a4a5a",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#e63946";
                e.currentTarget.style.color = "#e63946";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a3a";
                e.currentTarget.style.color = "#4a4a5a";
              }}
            >
              ↺ Sync
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-[10px] tracking-widest" style={{ color: "#2e2e42" }}>
            <span>LAST 10 ACTIONS</span>
            {revealCount > 0 && (
              <span style={{ color: "#7a1520" }}>
                {revealCount} REVEAL{revealCount > 1 ? "S" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── Countdown refresh bar ── */}
        <CountdownBar interval={REFRESH_INTERVAL} lastFetch={lastFetch} />

        {/* ── Refresh indicator ── */}
        {refreshing && (
          <div
            className="flex-none px-4 py-1.5 text-[10px] tracking-widest uppercase text-center animate-pulse"
            style={{ color: "#e63946", background: "rgba(230,57,70,0.05)" }}
          >
            Syncing…
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 relative" ref={listRef}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#1e1e2e transparent",
          }}
        >
          {/* Loading skeleton */}
          {loading && (
            <ul className="divide-y" style={{ borderColor: "#111118" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-4 py-3 flex flex-col gap-2 animate-pulse">
                  <div className="h-2 rounded w-3/4" style={{ background: "#1a1a24" }} />
                  <div className="h-1.5 rounded w-1/2" style={{ background: "#141420" }} />
                </li>
              ))}
            </ul>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
              <span className="text-2xl" style={{ color: "#e63946" }}>⚠</span>
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "#e63946" }}>
                Feed Error
              </p>
              <p className="text-[10px]" style={{ color: "#3a3a4a" }}>{error}</p>
              <button
                onClick={() => fetchAudit()}
                className="text-[10px] tracking-widest uppercase px-3 py-1 border"
                style={{ borderColor: "#e63946", color: "#e63946", background: "rgba(230,57,70,0.08)" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "#2e2e42" }}>
                No actions logged
              </p>
            </div>
          )}

          {/* Entry list */}
          {!loading && !error && entries.length > 0 && (
            <ul>
              {entries.map((entry, i) => (
                <AuditEntry key={entry.id ?? i} entry={entry} index={i} />
              ))}
            </ul>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex-none flex items-center justify-between px-4 py-2 border-t text-[10px]"
          style={{
            borderColor: "#1a1a24",
            background: "#0d0d14",
            color: "#2a2a3a",
          }}
        >
          <span className="tracking-widest uppercase">Auto ↺ 30s</span>
          <span className="tabular-nums">
            {new Date(lastFetch).toLocaleTimeString("en-US", { hour12: false })}
          </span>
        </div>
      </aside>
    </>
  );
}
