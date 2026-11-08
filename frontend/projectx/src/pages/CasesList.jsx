import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { assetUrl } from "../api";
import AuditLog from "../components/AuditLog";

const STATUS_STYLE = {
  open:   { color: "#eab308", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.3)" },
  found:  { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)" },
  closed: { color: "#66667a", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.12)" },
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function CaseCard({ c, onStatus }) {
  const st = STATUS_STYLE[c.status] || STATUS_STYLE.open;
  return (
    <div className="rounded-sm border border-white/10 p-4 flex gap-4"
         style={{ background: "rgba(255,255,255,0.025)" }}>
      <div className="w-20 h-24 flex-shrink-0 rounded-sm overflow-hidden flex items-center justify-center"
           style={{ background: "#0f0f18", border: "1px solid rgba(255,255,255,0.08)" }}>
        {c.photo_url
          ? <img src={assetUrl(c.photo_url)} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-xs font-mono" style={{ color: "#33334a" }}>NO PHOTO</span>}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold truncate" style={{ color: "#f0f0f5" }}>{c.name}</span>
            <span className="text-xs font-mono" style={{ color: "#44445a" }}>#{c.id.slice(0, 8)}</span>
          </div>
          <select
            value={c.status || "open"}
            onChange={(e) => onStatus(c.id, e.target.value)}
            className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm outline-none cursor-pointer"
            style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}
            aria-label={`Status for ${c.name}`}
          >
            <option value="open">Open</option>
            <option value="found">Found</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono" style={{ color: "#8888aa" }}>
          {c.age != null && <span>{c.age} yrs</span>}
          {c.gender && <span>{c.gender}</span>}
          {c.last_seen_location && <span>📍 {c.last_seen_location}</span>}
          <span>Last seen {fmtDate(c.date_last_seen)}</span>
          {c.contact && <span>☎ {c.contact}</span>}
        </div>

        {c.description && (
          <p className="text-xs leading-relaxed m-0" style={{ color: "#a0a0b8" }}>{c.description}</p>
        )}

        <div className="flex flex-wrap gap-3 pt-1 text-xs font-mono uppercase tracking-wider">
          <span style={{ color: "#55556a" }}>{c.sighting_count} sighting{c.sighting_count === 1 ? "" : "s"}</span>
          <span style={{ color: "#55556a" }}>{c.match_count} match{c.match_count === 1 ? "" : "es"}</span>
          <Link to={`/matches?case_id=${c.id}`} style={{ color: "#e63946" }}>Matches →</Link>
          <Link to={`/map?case_id=${c.id}`} style={{ color: "#e63946" }}>Map →</Link>
        </div>
      </div>
    </div>
  );
}

export default function CasesList() {
  const [cases, setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [status, setStatus] = useState("all");
  const [q, setQ]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getCases({ status, q });
      setCases(d.cases || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  const onStatus = async (id, newStatus) => {
    const prev = cases;
    setCases(cs => cs.map(c => c.id === id ? { ...c, status: newStatus } : c));
    try {
      await api.updateCaseStatus(id, newStatus);
      if (status !== "all") load();
    } catch (e) {
      setCases(prev);
      setError(`Could not update status: ${e.message}`);
    }
  };

  return (
    <div className="min-h-full" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
      <div className="max-w-5xl mx-auto py-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8" style={{ background: "#e63946" }} />
            <h1 className="text-xl font-bold uppercase tracking-widest m-0" style={{ color: "#fff" }}>
              Registered Cases
            </h1>
          </div>

          <div className="flex gap-3">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, description or case ID…"
              className="flex-1 text-xs font-mono px-3 py-2 rounded-sm outline-none border border-white/10 text-white"
              style={{ background: "#0f0f18" }}
            />
            <select
              value={status} onChange={(e) => setStatus(e.target.value)}
              className="text-xs font-mono px-3 py-2 rounded-sm outline-none border border-white/10"
              style={{ background: "#0f0f18", color: "#a0a0b8" }}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="found">Found</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {error && (
            <p className="text-xs font-mono" style={{ color: "#e63946" }}>⚠ {error}</p>
          )}

          <div className="space-y-3">
            {loading && cases.length === 0 ? (
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#44445a" }}>Loading…</p>
            ) : cases.length === 0 && !error ? (
              <div className="text-center py-16 space-y-2" style={{ color: "#44445a" }}>
                <p className="text-xs uppercase tracking-widest">No cases found</p>
                <Link to="/" className="text-xs" style={{ color: "#e63946" }}>Register a case →</Link>
              </div>
            ) : (
              cases.map(c => <CaseCard key={c.id} c={c} onStatus={onStatus} />)
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <AuditLog />
        </div>
      </div>
    </div>
  );
}
