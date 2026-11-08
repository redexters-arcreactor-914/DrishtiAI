import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { assetUrl } from "../api";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return "Unknown time";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const confColor = (pct) => {
  if (pct >= 70) return { bar: "#22c55e", label: "HIGH", ring: "#16a34a" };
  if (pct >= 40) return { bar: "#eab308", label: "MED",  ring: "#ca8a04" };
  return              { bar: "#e63946", label: "LOW",  ring: "#be123c" };
};

// ── SKELETON ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-sm border border-white/10 p-5 space-y-4 overflow-hidden relative"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div className="h-px w-full absolute top-0 left-0"
           style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
      <div className="flex justify-between items-start gap-4">
        <div className="h-3 w-40 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        <div className="h-3 w-24 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        <div className="h-2.5 w-5/6 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        <div className="h-2.5 w-4/6 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        <div className="h-4 w-10 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
      </div>
    </div>
  );
}

// ── SIGHTING CARD ─────────────────────────────────────────────────────────────
function SightingCard({ s, idx, onMap }) {
  // NLP confidence is stored as a 0–1 float; null means extraction failed
  const rawConf = s.confidence ?? s.nlp_data?.confidence;
  const hasConf = rawConf !== null && rawConf !== undefined;
  const confPct = !hasConf ? 0 : rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf);

  const { bar, label, ring } = hasConf ? confColor(confPct) : { bar: "#55556a", label: "N/A", ring: "#33334a" };
  const hasCoords = s.latitude != null && s.longitude != null;
  const warning = s.nlp_data?.warning;
  const engine = s.nlp_data?.engine;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), idx * 80);
    return () => clearTimeout(t);
  }, [idx]);

  const location = s.location || s.nlp_data?.location || "Unknown location";
  const date     = s.sighted_at || s.created_at;
  const desc     = s.raw_text   || s.description || "";

  return (
    <div
      className="rounded-sm border border-white/10 overflow-hidden relative transition-all duration-500"
      style={{
        background: "rgba(255,255,255,0.025)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* accent top bar */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${bar},transparent)` }} />

      <div className="p-5 space-y-4">
        {/* header row */}
        <div className="flex flex-wrap justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
              style={{ background: bar, boxShadow: `0 0 6px ${bar}` }}
            />
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#a0a0b8" }}>
              {location}
            </span>
          </div>
          <span className="text-xs font-mono" style={{ color: "#55556a" }}>
            {s.sighted_at ? "Sighted " : "Reported "}{fmt(date)}
          </span>
        </div>

        {/* linked case */}
        <div className="text-xs font-mono" style={{ color: "#55556a" }}>
          CASE ·{" "}
          {s.case_id
            ? <span style={{ color: "#a0a0b8" }}>{s.case_name || "Unknown"} <span style={{ color: "#44445a" }}>#{s.case_id.slice(0, 8)}</span></span>
            : <span style={{ color: "#44445a" }}>not linked</span>}
        </div>

        {/* description + photo */}
        <div className="flex gap-4 items-start">
          <p className="flex-1 text-sm leading-relaxed m-0" style={{ color: "#c8c8d8", fontFamily: "'Courier New', monospace" }}>
            {desc}
          </p>
          {s.photo_url && (
            <img src={assetUrl(s.photo_url)} alt="Sighting" loading="lazy"
                 className="w-20 h-20 object-cover rounded-sm flex-shrink-0"
                 style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
          )}
        </div>

        {/* NLP tags — show extracted data if available */}
        {s.nlp_data && (s.nlp_data.location || s.nlp_data.sighted_at) && (
          <div className="flex flex-wrap gap-2">
            {s.nlp_data.location && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
                style={{ background: "#1a2a1a", border: "1px solid #22c55e30", color: "#22c55e" }}>
                📍 {s.nlp_data.location}
              </span>
            )}
            {s.nlp_data.sighted_at && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
                style={{ background: "#1a1a2a", border: "1px solid #6366f130", color: "#818cf8" }}>
                🕐 {s.nlp_data.sighted_at}
              </span>
            )}
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
              style={{ background: "#0a0a14", border: "1px solid #ffffff10", color: "#44445a" }}>
              {engine === "offline" ? "Rule-based extraction" : "AI · NLP extracted"}
            </span>
          </div>
        )}
        {s.nlp_data?.description && (
          <p className="text-xs font-mono m-0" style={{ color: "#8888aa" }}>
            👤 {s.nlp_data.description}
          </p>
        )}
        {warning && (
          <p className="text-xs font-mono m-0" style={{ color: "#a16207" }} title={warning}>
            ⚠ {engine === "offline" ? `Gemini unavailable — used offline extractor. Reason: ${warning.replace(/\s*—\s*used offline extractor$/, "")}` : warning}
          </p>
        )}

        {/* confidence bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono" style={{ color: "#55556a" }}>REPORT CONFIDENCE</span>
              <span
                className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
                style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}
              >
                {hasConf ? `${label} · ${confPct}%` : "N/A"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-sm overflow-hidden" style={{ background: "#1a1a24" }}>
              <div
                className="h-full rounded-sm transition-all duration-1000"
                style={{
                  width: `${confPct}%`,
                  background: `linear-gradient(90deg, ${bar}99, ${bar})`,
                  boxShadow: `0 0 8px ${bar}66`,
                }}
              />
            </div>
          </div>

          <button
            onClick={() => onMap(s)}
            disabled={!hasCoords}
            title={hasCoords ? "Show on live map" : "No coordinates could be extracted for this report"}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${ring}50`,
              color: bar,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Map
          </button>
        </div>
      </div>

      {/* id tag */}
      <div className="absolute bottom-2 right-3 text-xs font-mono" style={{ color: "#2a2a3a" }}>
        #{s.id?.slice(0, 8)}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function SightingFeed() {
  const [text, setText]           = useState("");
  const [caseId, setCaseId]       = useState("");
  const [photo, setPhoto]         = useState(null);   // File object for sighting photo
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoRef                  = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]         = useState(null);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [cases, setCases]         = useState([]);
  const [loadError, setLoadError] = useState(null);
  const toastTimer = useRef(null);
  const navigate = useNavigate();

  const loadSightings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getSightings({ limit: 100 });
      setSightings(data.sightings || []);
    } catch (e) {
      setLoadError(e.message);
      setSightings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSightings();
    api.getCases().then(d => setCases(d.cases || [])).catch(() => {});
  }, [loadSightings]);

  // revoke preview object URLs to avoid leaking memory
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (type, msg, ms = 5000) => {
    clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (photoRef.current) photoRef.current.value = "";
  };

  // ── submit sighting report ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await api.addSighting(text.trim(), caseId || null, photo);
      const nlp  = data.nlp || {};
      const locationMsg = nlp.location ? ` · ${nlp.location}` : " · location not detected";
      const reliable = (data.matches || []).filter(m => !m.low_reliability);
      const matchMsg = data.match_note
        ? ` · ${data.match_note}`
        : data.matches?.length
          ? reliable.length
            ? ` · 🎯 possible face match (${Math.round(reliable[0].score)}%) — review in Match Results`
            : " · weak similarity only (no face engine) — review manually"
          : photo ? " · no face match above threshold" : "";

      showToast("success", `Report submitted${locationMsg}${matchMsg}`, 8000);
      setText(""); setCharCount(0);
      clearPhoto();
      await loadSightings();

    } catch (e) {
      showToast("error", e.message || "Submission failed. Check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const showOnMap = (s) => navigate(`/map${s.case_id ? `?case_id=${encodeURIComponent(s.case_id)}` : ""}`);

  return (
    <div
      className="min-h-full"
      style={{ background: "#0a0a0f", fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* ── PAGE HEADER ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8" style={{ background: "#e63946" }} />
            <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#ffffff" }}>
              Sighting Intelligence Feed
            </h1>
          </div>
          <p className="text-xs pl-4 uppercase tracking-wider" style={{ color: "#44445a" }}>
            SYSTEM · ACTIVE · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── REPORT INPUT ── */}
        <div
          className="rounded-sm border border-white/10 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.025)" }}
        >
          <div
            className="px-4 py-2 flex items-center justify-between border-b border-white/10"
            style={{ background: "rgba(230,57,70,0.06)" }}
          >
            <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
              ▸ New Sighting Report
            </span>
            <span className="text-xs font-mono" style={{ color: "#44445a" }}>
              {charCount} chars
            </span>
          </div>

          <div className="p-4 space-y-3">

            {/* Case selector */}
            <div>
              <label className="text-xs font-mono uppercase tracking-widest mb-1 block" style={{ color: "#55556a" }}>
                Linked Case <span style={{ color: "#44445a" }}>(optional — required for face matching)</span>
              </label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full outline-none text-xs font-mono px-3 py-2 rounded-sm border border-white/10"
                style={{ background: "#0f0f18", color: caseId ? "#e0e0ea" : "#66667a" }}
              >
                <option value="">— Not linked to a case —</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.age ? ` (${c.age})` : ""} — #{c.id.slice(0, 8)}{c.photo_url ? "" : " · no photo"}
                  </option>
                ))}
              </select>
            </div>

            {/* Photo upload — triggers DeepFace matching */}
            <div>
              <label className="text-xs font-mono uppercase tracking-widest mb-1 block" style={{ color: "#55556a" }}>
                Sighting Photo{" "}
                <span style={{ color: "#22c55e" }}>(attach to trigger AI face matching)</span>
              </label>
              <div
                onClick={() => photoRef.current?.click()}
                className="relative rounded-sm border border-dashed cursor-pointer transition-all"
                style={{
                  borderColor: photo ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)",
                  background: photo ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
                  minHeight: photo ? "auto" : 72,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {photoPreview ? (
                  <div className="relative w-full">
                    <img src={photoPreview} alt="Sighting preview"
                         className="w-full rounded-sm object-cover" style={{ maxHeight: 160 }} />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); clearPhoto(); }}
                        className="text-xs font-mono px-2 py-1 rounded-sm"
                        style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(230,57,70,0.4)", color: "#e63946" }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 rounded-b-sm"
                         style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                      <span className="text-xs font-mono" style={{ color: "#22c55e" }}>
                        ✓ {photo?.name} · {photo ? (photo.size/1024).toFixed(0) : 0}KB
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="#33334a" strokeWidth="1.5" className="mx-auto mb-2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p className="text-xs font-mono" style={{ color: "#33334a" }}>
                      Click to attach sighting photo
                    </p>
                  </div>
                )}
                <input
                  ref={photoRef} type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10 * 1024 * 1024) {
                      showToast("error", "Photo is larger than 10 MB.");
                      e.target.value = "";
                      return;
                    }
                    setPhoto(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }}
                />
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setCharCount(e.target.value.length); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
              maxLength={5000}
              placeholder="Describe the sighting in plain text — include location, time, physical appearance, direction of movement, and any distinguishing features..."
              rows={5}
              className="w-full resize-none outline-none text-sm leading-relaxed placeholder:opacity-30 text-white px-3 py-2 rounded-sm border border-white/10"
              style={{ caretColor: "#e63946", background: "rgba(255,255,255,0.03)", fontFamily: "inherit" }}
            />

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                className="flex items-center gap-2 px-5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  background: submitting ? "#3a1014" : "linear-gradient(135deg,#e63946,#c1121f)",
                  color: "#fff",
                  boxShadow: submitting ? "none" : "0 0 16px #e6394640",
                }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    {photo && caseId ? "Analysing photo…" : "Transmitting…"}
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── SIGHTING LIST HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
              Reported Sightings
            </span>
            {!loading && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                style={{ background: "#e6394618", color: "#e63946", border: "1px solid #e6394930" }}
              >
                {sightings.length}
              </span>
            )}
          </div>
          <div className="h-px flex-1 mx-4" style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
          <button
            onClick={loadSightings}
            className="text-xs font-mono uppercase tracking-widest cursor-pointer"
            style={{ color: "#44445a", background: "none" }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* ── CARDS ── */}
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : loadError
              ? (
                <div className="text-center py-16" style={{ color: "#e63946" }}>
                  <p className="text-xs uppercase tracking-widest">Could not load sightings</p>
                  <p className="text-xs mt-2" style={{ color: "#66667a" }}>{loadError}</p>
                </div>
              )
            : sightings.length === 0
              ? (
                <div className="text-center py-16" style={{ color: "#44445a" }}>
                  <p className="text-xs uppercase tracking-widest">No sightings recorded yet</p>
                  <p className="text-xs mt-2 opacity-50">Submit a report above to begin</p>
                </div>
              )
              : sightings.map((s, i) => <SightingCard key={s.id} s={s} idx={Math.min(i, 10)} onMap={showOnMap} />)
          }
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-mono uppercase tracking-wider shadow-lg"
          style={{
            background: toast.type === "success" ? "#0d2b12" : "#2b0d0d",
            border: `1px solid ${toast.type === "success" ? "#22c55e40" : "#e6394640"}`,
            color: toast.type === "success" ? "#22c55e" : "#e63946",
            maxWidth: "420px",
          }}
        >
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100 cursor-pointer" style={{ background: "none", color: "inherit" }}>×</button>
        </div>
      )}
    </div>
  );
}
