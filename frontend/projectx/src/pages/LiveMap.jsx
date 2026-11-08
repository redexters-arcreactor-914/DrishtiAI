import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";

export default function LiveMap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseId = searchParams.get("case_id") || "";
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cases, setCases]           = useState([]);
  const [pointCount, setPointCount] = useState(null);
  const [updatedAt, setUpdatedAt]   = useState(null);

  // An <iframe> never fires onError for HTTP/network failures, so probe the
  // backend first and show a real error state if it is down.
  const probe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api.mapUrl(caseId || null)}${caseId ? "&" : "?"}fmt=json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPointCount(data.total);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setLoading(false);
      setError(`Could not load map — is the backend running? (${e.message})`);
    }
  }, [caseId]);

  useEffect(() => { probe(); }, [probe]);
  useEffect(() => { api.getCases().then(d => setCases(d.cases || [])).catch(() => {}); }, []);

  const handleLoad = () => { setLoading(false); setUpdatedAt(new Date()); };
  const refresh    = () => probe();
  const onCase     = (e) => setSearchParams(e.target.value ? { case_id: e.target.value } : {});

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100%", height: "calc(100vh - 52px - 56px)", minHeight: 420,
      border: "1px solid rgba(230,57,70,0.15)",
      background: "#0a0a0f",
      fontFamily: "'Courier New', Courier, monospace",
      overflow: "hidden",
    }}>

      {/* ── Header ── */}
      <header style={{
        flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "10px 24px",
        background: "#0d0d14", borderBottom: "1px solid rgba(230,57,70,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ position: "relative", display: "flex", width: 10, height: 10 }}>
            <span style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "#e63946", opacity: 0.75,
              animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
            }} />
            <span style={{ position: "relative", borderRadius: "50%", width: 10, height: 10, background: "#e63946" }} />
          </span>
          <span style={{ color: "#e63946", fontSize: 13, fontWeight: "bold", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Live Sighting Map
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select value={caseId} onChange={onCase} aria-label="Filter by case" style={{
            background: "#0f0f18", color: "#a0a0b8", fontSize: 11, padding: "3px 8px",
            border: "1px solid rgba(255,255,255,0.12)", fontFamily: "inherit", maxWidth: 260,
          }}>
            <option value="">All cases</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.name} — #{c.id.slice(0, 8)}</option>)}
          </select>
          <span style={{ color: "#6a6a7a", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {pointCount === null ? "—" : `${pointCount} point${pointCount === 1 ? "" : "s"}`}
          </span>
          <span style={{ color: "#e63946", fontSize: 11, letterSpacing: "0.15em", padding: "2px 8px", border: "1px solid #e63946", background: "rgba(230,57,70,0.08)" }}>LIVE</span>
          <button onClick={refresh} style={{
            color: "#e63946", fontSize: 11, letterSpacing: "0.1em",
            padding: "2px 10px", border: "1px solid rgba(230,57,70,0.4)",
            background: "rgba(230,57,70,0.05)", cursor: "pointer", textTransform: "uppercase",
          }}>↻ Refresh</button>
        </div>
      </header>

      {/* red scan line under header */}
      <div style={{ flexShrink: 0, height: 1, background: "linear-gradient(90deg,transparent,#e63946,transparent)", opacity: 0.5 }} />

      {/* ── Map area — takes ALL remaining height ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>

        {/* scanline texture overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,0.1) 0px,rgba(0,0,0,0.1) 1px,transparent 1px,transparent 3px)",
        }} />

        {/* corner brackets */}
        {[
          { top: 8,    left: 8,   borderTop:    "1px solid rgba(230,57,70,0.5)", borderLeft:   "1px solid rgba(230,57,70,0.5)" },
          { top: 8,    right: 8,  borderTop:    "1px solid rgba(230,57,70,0.5)", borderRight:  "1px solid rgba(230,57,70,0.5)" },
          { bottom: 8, left: 8,   borderBottom: "1px solid rgba(230,57,70,0.5)", borderLeft:   "1px solid rgba(230,57,70,0.5)" },
          { bottom: 8, right: 8,  borderBottom: "1px solid rgba(230,57,70,0.5)", borderRight:  "1px solid rgba(230,57,70,0.5)" },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", zIndex: 20, pointerEvents: "none", width: 20, height: 20, ...s }} />
        ))}

        {/* Loading spinner */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 30,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
            background: "#0a0a0f",
          }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(230,57,70,0.15)" }} />
              <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "1px solid rgba(230,57,70,0.1)" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg,rgba(230,57,70,0.7) 0deg,transparent 90deg)", animation: "spin 1.2s linear infinite" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e63946" }} />
              </div>
            </div>
            <p style={{ color: "#e63946", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase" }}>Acquiring Signal…</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 30,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            background: "#0a0a0f",
          }}>
            <span style={{ color: "#e63946", fontSize: 32 }}>⚠</span>
            <p style={{ color: "#e63946", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}>Signal Lost</p>
            <p style={{ color: "#4a4a5a", fontSize: 11 }}>{error}</p>
            <button onClick={refresh} style={{
              marginTop: 8, color: "#e63946", fontSize: 11, padding: "4px 16px",
              border: "1px solid #e63946", background: "rgba(230,57,70,0.08)",
              cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase",
            }}>Retry</button>
          </div>
        )}

        {/* ── THE MAP — fills entire container ── */}
        {refreshKey > 0 && !error && (
        <iframe
          key={refreshKey}
          src={api.mapUrl(caseId || null)}
          title="Live Sighting Map"
          onLoad={handleLoad}
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: "100%",
            height: "100%",
            border: "none",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.6s ease",
          }}
        />
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 24px", background: "#0d0d14", borderTop: "1px solid rgba(230,57,70,0.15)",
      }}>
        <span style={{ color: "#4a4a5a", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          {error ? "Sys: Offline" : "Sys: Nominal"}
        </span>
        <span style={{ color: "#4a4a5a", fontSize: 11, letterSpacing: "0.1em" }}>
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en-IN", { hour12: false })}` : "—"}
        </span>
      </div>

      <style>{`
        @keyframes ping { 75%,100% { transform:scale(2); opacity:0; } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}