import { useState, useEffect, useRef } from "react";

const API = "http://127.0.0.1:5000";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
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
function SightingCard({ s, idx }) {
  // confidence comes from NLP extraction (0–1 float) or face match (0–100)
  // normalise everything to 0–100
  const rawConf = s.confidence ?? s.nlp_data?.confidence ?? 0;
  const confPct = rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf);

  const { bar, label, ring } = confColor(confPct);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), idx * 80);
    return () => clearTimeout(t);
  }, [idx]);

  // location: prefer top-level, fall back to nlp_data
  const location = s.location || s.nlp_data?.location || "Unknown location";
  const date     = s.sighted_at || s.created_at || s.date;
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
            {fmt(date)}
          </span>
        </div>

        {/* description */}
        <p className="text-sm leading-relaxed" style={{ color: "#c8c8d8", fontFamily: "'Courier New', monospace" }}>
          {desc}
        </p>

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
              AI · NLP extracted
            </span>
          </div>
        )}

        {/* confidence bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono" style={{ color: "#55556a" }}>CONFIDENCE</span>
              <span
                className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
                style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}
              >
                {label} · {confPct}%
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
            onClick={() => console.log("View on map:", s.id, location)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95"
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

      {/* corner tag */}
      <div className="absolute top-2 right-2 text-xs font-mono px-1" style={{ color: "#2a2a3a" }}>
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
  const toastTimer = useRef(null);

  // ── fetch real sightings from backend ────────────────────────────────────────
  const loadSightings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/sightings`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      // API returns { sightings: [...], total: N }
      setSightings(Array.isArray(data) ? data : (data.sightings || []));
    } catch (e) {
      console.warn("Could not load sightings from API:", e);
      setSightings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSightings(); }, []);

  const showToast = (type, msg) => {
    clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // ── submit sighting report ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      let res;
      if (photo) {
        // FormData when photo attached → triggers DeepFace matching on backend
        const fd = new FormData();
        fd.append("raw_text", text.trim());
        fd.append("photo", photo);
        if (caseId.trim()) fd.append("case_id", caseId.trim());
        res = await fetch(`${API}/api/sighting`, { method: "POST", body: fd });
      } else {
        // JSON for text-only sightings
        res = await fetch(`${API}/api/sighting`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_text: text.trim(), case_id: caseId.trim() || null }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const nlp  = data.nlp || {};
      const locationMsg = nlp.location ? ` · ${nlp.location}` : "";
      const matchMsg    = data.matches?.length
        ? ` · 🎯 ${data.matches.length} face match(es) found!`
        : photo ? " · Photo saved, no face match above threshold" : "";

      showToast("success", `Report submitted${locationMsg}${matchMsg}`);
      setText(""); setCharCount(0);
      setPhoto(null); setPhotoPreview(null);
      await loadSightings();

    } catch (e) {
      showToast("error", e.message || "Submission failed. Check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen"
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

            {/* Case ID field */}
            <div>
              <label className="text-xs font-mono uppercase tracking-widest mb-1 block" style={{ color: "#55556a" }}>
                Case ID <span style={{ color: "#44445a" }}>(optional — links to registered case for face matching)</span>
              </label>
              <input
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="e.g. b00a6ae8-6c91-41d2-98f6-925df8ec676f"
                className="w-full bg-transparent outline-none text-xs font-mono text-white placeholder:opacity-20 px-3 py-2 rounded-sm border border-white/10"
                style={{ background: "rgba(255,255,255,0.03)", caretColor: "#e63946" }}
              />
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
                        onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); }}
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
                    setPhoto(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }}
                />
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setCharCount(e.target.value.length); }}
              placeholder="Describe the sighting in plain text — include location, time, physical appearance, direction of movement, and any distinguishing features..."
              rows={5}
              className="w-full resize-none bg-transparent outline-none text-sm leading-relaxed placeholder:opacity-30 text-white"
              style={{ caretColor: "#e63946" }}
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
                    Transmitting…
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
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "#44445a" }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* ── CARDS ── */}
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : sightings.length === 0
              ? (
                <div className="text-center py-16" style={{ color: "#44445a" }}>
                  <p className="text-xs uppercase tracking-widest">No sightings recorded yet</p>
                  <p className="text-xs mt-2 opacity-50">Submit a report above to begin</p>
                </div>
              )
              : sightings.map((s, i) => <SightingCard key={s.id} s={s} idx={i} />)
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
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100">×</button>
        </div>
      )}
    </div>
  );
}



// import { useState, useEffect, useRef } from "react";

// const API = "http://127.0.0.1:5000";

// // ── helpers ───────────────────────────────────────────────────────────────────
// const fmt = (iso) => {
//   try {
//     return new Date(iso).toLocaleString("en-US", {
//       month: "short", day: "2-digit", year: "numeric",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return iso; }
// };

// const confColor = (pct) => {
//   if (pct >= 70) return { bar: "#22c55e", label: "HIGH", ring: "#16a34a" };
//   if (pct >= 40) return { bar: "#eab308", label: "MED",  ring: "#ca8a04" };
//   return              { bar: "#e63946", label: "LOW",  ring: "#be123c" };
// };

// // ── SKELETON ──────────────────────────────────────────────────────────────────
// function SkeletonCard() {
//   return (
//     <div
//       className="rounded-sm border border-white/10 p-5 space-y-4 overflow-hidden relative"
//       style={{ background: "rgba(255,255,255,0.02)" }}
//     >
//       <div className="h-px w-full absolute top-0 left-0"
//            style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
//       <div className="flex justify-between items-start gap-4">
//         <div className="h-3 w-40 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-3 w-24 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="space-y-2">
//         <div className="h-2.5 w-full rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-2.5 w-5/6 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-2.5 w-4/6 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="flex items-center gap-3">
//         <div className="h-2 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-4 w-10 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//     </div>
//   );
// }

// // ── SIGHTING CARD ─────────────────────────────────────────────────────────────
// function SightingCard({ s, idx }) {
//   // confidence comes from NLP extraction (0–1 float) or face match (0–100)
//   // normalise everything to 0–100
//   const rawConf = s.confidence ?? s.nlp_data?.confidence ?? 0;
//   const confPct = rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf);

//   const { bar, label, ring } = confColor(confPct);
//   const [visible, setVisible] = useState(false);

//   useEffect(() => {
//     const t = setTimeout(() => setVisible(true), idx * 80);
//     return () => clearTimeout(t);
//   }, [idx]);

//   // location: prefer top-level, fall back to nlp_data
//   const location = s.location || s.nlp_data?.location || "Unknown location";
//   const date     = s.sighted_at || s.created_at || s.date;
//   const desc     = s.raw_text   || s.description || "";

//   return (
//     <div
//       className="rounded-sm border border-white/10 overflow-hidden relative transition-all duration-500"
//       style={{
//         background: "rgba(255,255,255,0.025)",
//         opacity: visible ? 1 : 0,
//         transform: visible ? "translateY(0)" : "translateY(12px)",
//       }}
//     >
//       {/* accent top bar */}
//       <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${bar},transparent)` }} />

//       <div className="p-5 space-y-4">
//         {/* header row */}
//         <div className="flex flex-wrap justify-between items-start gap-2">
//           <div className="flex items-center gap-2">
//             <span
//               className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
//               style={{ background: bar, boxShadow: `0 0 6px ${bar}` }}
//             />
//             <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#a0a0b8" }}>
//               {location}
//             </span>
//           </div>
//           <span className="text-xs font-mono" style={{ color: "#55556a" }}>
//             {fmt(date)}
//           </span>
//         </div>

//         {/* description */}
//         <p className="text-sm leading-relaxed" style={{ color: "#c8c8d8", fontFamily: "'Courier New', monospace" }}>
//           {desc}
//         </p>

//         {/* NLP tags — show extracted data if available */}
//         {s.nlp_data && (s.nlp_data.location || s.nlp_data.sighted_at) && (
//           <div className="flex flex-wrap gap-2">
//             {s.nlp_data.location && (
//               <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
//                 style={{ background: "#1a2a1a", border: "1px solid #22c55e30", color: "#22c55e" }}>
//                 📍 {s.nlp_data.location}
//               </span>
//             )}
//             {s.nlp_data.sighted_at && (
//               <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
//                 style={{ background: "#1a1a2a", border: "1px solid #6366f130", color: "#818cf8" }}>
//                 🕐 {s.nlp_data.sighted_at}
//               </span>
//             )}
//             <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
//               style={{ background: "#0a0a14", border: "1px solid #ffffff10", color: "#44445a" }}>
//               AI · NLP extracted
//             </span>
//           </div>
//         )}

//         {/* confidence bar */}
//         <div className="flex items-center gap-4">
//           <div className="flex-1 space-y-1">
//             <div className="flex justify-between items-center mb-1">
//               <span className="text-xs font-mono" style={{ color: "#55556a" }}>CONFIDENCE</span>
//               <span
//                 className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
//                 style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}
//               >
//                 {label} · {confPct}%
//               </span>
//             </div>
//             <div className="h-1.5 w-full rounded-sm overflow-hidden" style={{ background: "#1a1a24" }}>
//               <div
//                 className="h-full rounded-sm transition-all duration-1000"
//                 style={{
//                   width: `${confPct}%`,
//                   background: `linear-gradient(90deg, ${bar}99, ${bar})`,
//                   boxShadow: `0 0 8px ${bar}66`,
//                 }}
//               />
//             </div>
//           </div>

//           <button
//             onClick={() => console.log("View on map:", s.id, location)}
//             className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95"
//             style={{
//               background: "rgba(255,255,255,0.04)",
//               border: `1px solid ${ring}50`,
//               color: bar,
//             }}
//           >
//             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//               <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
//             </svg>
//             Map
//           </button>
//         </div>
//       </div>

//       {/* corner tag */}
//       <div className="absolute top-2 right-2 text-xs font-mono px-1" style={{ color: "#2a2a3a" }}>
//         #{s.id?.slice(0, 8)}
//       </div>
//     </div>
//   );
// }

// // ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// export default function SightingFeed() {
//   const [text, setText]           = useState("");
//   const [caseId, setCaseId]       = useState("");   // ← NEW: link sighting to a case
//   const [submitting, setSubmitting] = useState(false);
//   const [toast, setToast]         = useState(null);
//   const [sightings, setSightings] = useState([]);
//   const [loading, setLoading]     = useState(true);
//   const [charCount, setCharCount] = useState(0);
//   const toastTimer = useRef(null);

//   // ── fetch real sightings from backend ────────────────────────────────────────
//   const loadSightings = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(`${API}/api/sightings`);
//       if (!res.ok) throw new Error("fetch failed");
//       const data = await res.json();
//       // API returns { sightings: [...], total: N }
//       setSightings(Array.isArray(data) ? data : (data.sightings || []));
//     } catch (e) {
//       console.warn("Could not load sightings from API:", e);
//       setSightings([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { loadSightings(); }, []);

//   const showToast = (type, msg) => {
//     clearTimeout(toastTimer.current);
//     setToast({ type, msg });
//     toastTimer.current = setTimeout(() => setToast(null), 4000);
//   };

//   // ── submit sighting report ───────────────────────────────────────────────────
//   const handleSubmit = async () => {
//     if (!text.trim()) return;
//     setSubmitting(true);
//     try {
//       const res = await fetch(`${API}/api/sighting`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           raw_text: text.trim(),          // ← correct key Flask expects
//           case_id:  caseId.trim() || null,
//         }),
//       });

//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         throw new Error(err.error || `Server error ${res.status}`);
//       }

//       const data = await res.json();

//       // Show what the AI extracted
//       const nlp = data.nlp || {};
//       const locationMsg = nlp.location ? ` · Location: ${nlp.location}` : "";
//       const matchMsg    = data.matches?.length
//         ? ` · ${data.matches.length} face match(es) found!`
//         : "";

//       showToast("success", `Report submitted${locationMsg}${matchMsg}`);
//       setText("");
//       setCharCount(0);

//       // Reload the real list from API
//       await loadSightings();

//     } catch (e) {
//       showToast("error", e.message || "Submission failed. Check connection and retry.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div
//       className="min-h-screen"
//       style={{ background: "#0a0a0f", fontFamily: "'Courier New', Courier, monospace" }}
//     >
//       {/* scanline overlay */}
//       <div
//         className="pointer-events-none fixed inset-0 z-0"
//         style={{
//           backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)",
//         }}
//       />

//       <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

//         {/* ── PAGE HEADER ── */}
//         <div className="space-y-1">
//           <div className="flex items-center gap-3">
//             <div className="w-1 h-8" style={{ background: "#e63946" }} />
//             <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#ffffff" }}>
//               Sighting Intelligence Feed
//             </h1>
//           </div>
//           <p className="text-xs pl-4 uppercase tracking-wider" style={{ color: "#44445a" }}>
//             SYSTEM · ACTIVE · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
//           </p>
//         </div>

//         {/* ── REPORT INPUT ── */}
//         <div
//           className="rounded-sm border border-white/10 overflow-hidden"
//           style={{ background: "rgba(255,255,255,0.025)" }}
//         >
//           <div
//             className="px-4 py-2 flex items-center justify-between border-b border-white/10"
//             style={{ background: "rgba(230,57,70,0.06)" }}
//           >
//             <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
//               ▸ New Sighting Report
//             </span>
//             <span className="text-xs font-mono" style={{ color: "#44445a" }}>
//               {charCount} chars
//             </span>
//           </div>

//           <div className="p-4 space-y-3">

//             {/* Case ID field — links sighting to a registered case */}
//             <div>
//               <label className="text-xs font-mono uppercase tracking-widest mb-1 block" style={{ color: "#55556a" }}>
//                 Case ID <span style={{ color: "#44445a" }}>(optional — links to registered case for face matching)</span>
//               </label>
//               <input
//                 type="text"
//                 value={caseId}
//                 onChange={(e) => setCaseId(e.target.value)}
//                 placeholder="e.g. b00a6ae8-6c91-41d2-98f6-925df8ec676f"
//                 className="w-full bg-transparent outline-none text-xs font-mono text-white placeholder:opacity-20 px-3 py-2 rounded-sm border border-white/10"
//                 style={{ background: "rgba(255,255,255,0.03)", caretColor: "#e63946" }}
//               />
//             </div>

//             <textarea
//               value={text}
//               onChange={(e) => { setText(e.target.value); setCharCount(e.target.value.length); }}
//               placeholder="Describe the sighting in plain text — include location, time, physical appearance, direction of movement, and any distinguishing features..."
//               rows={5}
//               className="w-full resize-none bg-transparent outline-none text-sm leading-relaxed placeholder:opacity-30 text-white"
//               style={{ caretColor: "#e63946" }}
//             />

//             <div className="flex justify-end">
//               <button
//                 onClick={handleSubmit}
//                 disabled={submitting || !text.trim()}
//                 className="flex items-center gap-2 px-5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
//                 style={{
//                   background: submitting ? "#3a1014" : "linear-gradient(135deg,#e63946,#c1121f)",
//                   color: "#fff",
//                   boxShadow: submitting ? "none" : "0 0 16px #e6394640",
//                 }}
//               >
//                 {submitting ? (
//                   <>
//                     <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                       <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
//                       <path d="M12 2a10 10 0 0 1 10 10" />
//                     </svg>
//                     Transmitting…
//                   </>
//                 ) : (
//                   <>
//                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                       <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
//                     </svg>
//                     Submit Report
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* ── SIGHTING LIST HEADER ── */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
//               Reported Sightings
//             </span>
//             {!loading && (
//               <span
//                 className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
//                 style={{ background: "#e6394618", color: "#e63946", border: "1px solid #e6394930" }}
//               >
//                 {sightings.length}
//               </span>
//             )}
//           </div>
//           <div className="h-px flex-1 mx-4" style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
//           <button
//             onClick={loadSightings}
//             className="text-xs font-mono uppercase tracking-widest"
//             style={{ color: "#44445a" }}
//           >
//             ↻ Refresh
//           </button>
//         </div>

//         {/* ── CARDS ── */}
//         <div className="space-y-4">
//           {loading
//             ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
//             : sightings.length === 0
//               ? (
//                 <div className="text-center py-16" style={{ color: "#44445a" }}>
//                   <p className="text-xs uppercase tracking-widest">No sightings recorded yet</p>
//                   <p className="text-xs mt-2 opacity-50">Submit a report above to begin</p>
//                 </div>
//               )
//               : sightings.map((s, i) => <SightingCard key={s.id} s={s} idx={i} />)
//           }
//         </div>
//       </div>

//       {/* ── TOAST ── */}
//       {toast && (
//         <div
//           className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-mono uppercase tracking-wider shadow-lg"
//           style={{
//             background: toast.type === "success" ? "#0d2b12" : "#2b0d0d",
//             border: `1px solid ${toast.type === "success" ? "#22c55e40" : "#e6394640"}`,
//             color: toast.type === "success" ? "#22c55e" : "#e63946",
//             maxWidth: "420px",
//           }}
//         >
//           <span>{toast.type === "success" ? "✓" : "✕"}</span>
//           <span>{toast.msg}</span>
//           <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100">×</button>
//         </div>
//       )}
//     </div>
//   );
// }











// import { useState, useEffect, useRef } from "react";

// // ── helpers ──────────────────────────────────────────────────────────────────
// const fmt = (iso) => {
//   try {
//     return new Date(iso).toLocaleString("en-US", {
//       month: "short", day: "2-digit", year: "numeric",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return iso; }
// };

// const confColor = (pct) => {
//   if (pct >= 70) return { bar: "#22c55e", label: "HIGH",   ring: "#16a34a" };
//   if (pct >= 40) return { bar: "#eab308", label: "MED",    ring: "#ca8a04" };
//   return              { bar: "#e63946", label: "LOW",    ring: "#be123c" };
// };

// // ── MOCK DATA (remove when real API is ready) ─────────────────────────────
// const MOCK_SIGHTINGS = [
//   {
//     id: "s001",
//     location: "Assi Ghat, Varanasi",
//     date: "2025-04-03T14:22:00Z",
//     description: "Individual matching description seen near the riverbank. Wearing a red kurta, appeared disoriented. Was last observed heading north along the ghats.",
//     confidence: 82,
//   },
//   {
//     id: "s002",
//     location: "Godowlia Chowk, Varanasi",
//     date: "2025-04-03T09:45:00Z",
//     description: "Possible match near the crowded market area. Height and build consistent. Did not respond to name when called. CCTV footage being reviewed.",
//     confidence: 57,
//   },
//   {
//     id: "s003",
//     location: "Cantonment Railway Station",
//     date: "2025-04-02T23:10:00Z",
//     description: "Subject seen at ticket counter. Bought a platform ticket. Left without boarding. Security footage retained for verification.",
//     confidence: 31,
//   },
// ];

// // ── SKELETON ─────────────────────────────────────────────────────────────────
// function SkeletonCard() {
//   return (
//     <div
//       className="rounded-sm border border-white/10 p-5 space-y-4 overflow-hidden relative"
//       style={{ background: "rgba(255,255,255,0.02)" }}
//     >
//       <div className="h-px w-full absolute top-0 left-0"
//            style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
//       <div className="flex justify-between items-start gap-4">
//         <div className="h-3 w-40 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-3 w-24 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="space-y-2">
//         <div className="h-2.5 w-full rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-2.5 w-5/6 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-2.5 w-4/6 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="flex items-center gap-3">
//         <div className="h-2 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-4 w-10 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//     </div>
//   );
// }

// // ── SIGHTING CARD ─────────────────────────────────────────────────────────────
// function SightingCard({ s, idx }) {
//   const { bar, label, ring } = confColor(s.confidence);
//   const [visible, setVisible] = useState(false);

//   useEffect(() => {
//     const t = setTimeout(() => setVisible(true), idx * 80);
//     return () => clearTimeout(t);
//   }, [idx]);

//   return (
//     <div
//       className="rounded-sm border border-white/10 overflow-hidden relative transition-all duration-500"
//       style={{
//         background: "rgba(255,255,255,0.025)",
//         opacity: visible ? 1 : 0,
//         transform: visible ? "translateY(0)" : "translateY(12px)",
//       }}
//     >
//       {/* accent top bar */}
//       <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${bar},transparent)` }} />

//       <div className="p-5 space-y-4">
//         {/* header row */}
//         <div className="flex flex-wrap justify-between items-start gap-2">
//           <div className="flex items-center gap-2">
//             <span
//               className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
//               style={{ background: bar, boxShadow: `0 0 6px ${bar}` }}
//             />
//             <span
//               className="text-xs font-mono uppercase tracking-widest"
//               style={{ color: "#a0a0b8" }}
//             >
//               {s.location}
//             </span>
//           </div>
//           <span className="text-xs font-mono" style={{ color: "#55556a" }}>
//             {fmt(s.date)}
//           </span>
//         </div>

//         {/* description */}
//         <p className="text-sm leading-relaxed" style={{ color: "#c8c8d8", fontFamily: "'Courier New', monospace" }}>
//           {s.description}
//         </p>

//         {/* confidence + actions */}
//         <div className="flex items-center gap-4">
//           <div className="flex-1 space-y-1">
//             <div className="flex justify-between items-center mb-1">
//               <span className="text-xs font-mono" style={{ color: "#55556a" }}>CONFIDENCE</span>
//               <span
//                 className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
//                 style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}
//               >
//                 {label} · {s.confidence}%
//               </span>
//             </div>
//             <div className="h-1.5 w-full rounded-sm overflow-hidden" style={{ background: "#1a1a24" }}>
//               <div
//                 className="h-full rounded-sm transition-all duration-1000"
//                 style={{
//                   width: `${s.confidence}%`,
//                   background: `linear-gradient(90deg, ${bar}99, ${bar})`,
//                   boxShadow: `0 0 8px ${bar}66`,
//                 }}
//               />
//             </div>
//           </div>

//           <button
//             onClick={() => console.log("View on map:", s.id, s.location)}
//             className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95"
//             style={{
//               background: "rgba(255,255,255,0.04)",
//               border: `1px solid ${ring}50`,
//               color: bar,
//             }}
//           >
//             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//               <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
//             </svg>
//             Map
//           </button>
//         </div>
//       </div>

//       {/* corner tag */}
//       <div
//         className="absolute top-2 right-2 text-xs font-mono px-1"
//         style={{ color: "#2a2a3a" }}
//       >
//         #{s.id}
//       </div>
//     </div>
//   );
// }

// // ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// export default function SightingFeed() {
//   const [text, setText] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [toast, setToast] = useState(null); // { type: "success"|"error", msg }
//   const [sightings, setSightings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [charCount, setCharCount] = useState(0);
//   const toastTimer = useRef(null);

//   // ── fetch sightings ──
//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       try {
//         const res = await fetch("/api/sightings");
//         if (!res.ok) throw new Error("fetch failed");
//         const data = await res.json();
//         setSightings(data);
//       } catch {
//         // fallback to mock
//         await new Promise((r) => setTimeout(r, 900));
//         setSightings(MOCK_SIGHTINGS);
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, []);

//   const showToast = (type, msg) => {
//     clearTimeout(toastTimer.current);
//     setToast({ type, msg });
//     toastTimer.current = setTimeout(() => setToast(null), 3800);
//   };

//   const handleSubmit = async () => {
//     if (!text.trim()) return;
//     setSubmitting(true);
//     try {
//       const res = await fetch("/api/sighting", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ report: text }),
//       });
//       if (!res.ok) throw new Error("Server error");
//       showToast("success", "Sighting report submitted successfully.");
//       setText(""); setCharCount(0);
//       // prepend a fake card for demo
//       setSightings((prev) => [{
//         id: `s${Date.now()}`,
//         location: "Submitted Location",
//         date: new Date().toISOString(),
//         description: text,
//         confidence: Math.floor(Math.random() * 60) + 20,
//       }, ...prev]);
//     } catch {
//       showToast("error", "Submission failed. Check connection and retry.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div
//       className="min-h-screen"
//       style={{
//         background: "#0a0a0f",
//         fontFamily: "'Courier New', Courier, monospace",
//       }}
//     >
//       {/* scanline overlay */}
//       <div
//         className="pointer-events-none fixed inset-0 z-0"
//         style={{
//           backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)",
//         }}
//       />

//       <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

//         {/* ── PAGE HEADER ── */}
//         <div className="space-y-1">
//           <div className="flex items-center gap-3">
//             <div className="w-1 h-8" style={{ background: "#e63946" }} />
//             <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#ffffff" }}>
//               Sighting Intelligence Feed
//             </h1>
//           </div>
//           <p className="text-xs pl-4 uppercase tracking-wider" style={{ color: "#44445a" }}>
//             SYSTEM · ACTIVE · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
//           </p>
//         </div>

//         {/* ── REPORT INPUT ── */}
//         <div
//           className="rounded-sm border border-white/10 overflow-hidden"
//           style={{ background: "rgba(255,255,255,0.025)" }}
//         >
//           <div
//             className="px-4 py-2 flex items-center justify-between border-b border-white/10"
//             style={{ background: "rgba(230,57,70,0.06)" }}
//           >
//             <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
//               ▸ New Sighting Report
//             </span>
//             <span className="text-xs font-mono" style={{ color: "#44445a" }}>
//               {charCount} chars
//             </span>
//           </div>

//           <div className="p-4 space-y-3">
//             <textarea
//               value={text}
//               onChange={(e) => { setText(e.target.value); setCharCount(e.target.value.length); }}
//               placeholder="Describe the sighting in plain text — include location, time, physical appearance, direction of movement, and any distinguishing features..."
//               rows={5}
//               className="w-full resize-none bg-transparent outline-none text-sm leading-relaxed placeholder:opacity-30 text-white"
//               style={{ caretColor: "#e63946" }}
//             />

//             <div className="flex justify-end">
//               <button
//                 onClick={handleSubmit}
//                 disabled={submitting || !text.trim()}
//                 className="flex items-center gap-2 px-5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
//                 style={{
//                   background: submitting ? "#3a1014" : "linear-gradient(135deg,#e63946,#c1121f)",
//                   color: "#fff",
//                   boxShadow: submitting ? "none" : "0 0 16px #e6394640",
//                 }}
//               >
//                 {submitting ? (
//                   <>
//                     <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                       <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
//                       <path d="M12 2a10 10 0 0 1 10 10" />
//                     </svg>
//                     Transmitting…
//                   </>
//                 ) : (
//                   <>
//                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                       <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
//                     </svg>
//                     Submit Report
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* ── SIGHTING LIST HEADER ── */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
//               Reported Sightings
//             </span>
//             {!loading && (
//               <span
//                 className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
//                 style={{ background: "#e6394618", color: "#e63946", border: "1px solid #e6394930" }}
//               >
//                 {sightings.length}
//               </span>
//             )}
//           </div>
//           <div className="h-px flex-1 mx-4" style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
//           <span className="text-xs font-mono" style={{ color: "#44445a" }}>
//             LIVE FEED
//           </span>
//         </div>

//         {/* ── CARDS ── */}
//         <div className="space-y-4">
//           {loading
//             ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
//             : sightings.length === 0
//               ? (
//                 <div className="text-center py-16" style={{ color: "#44445a" }}>
//                   <p className="text-xs uppercase tracking-widest">No sightings recorded</p>
//                 </div>
//               )
//               : sightings.map((s, i) => <SightingCard key={s.id} s={s} idx={i} />)
//           }
//         </div>
//       </div>

//       {/* ── TOAST ── */}
//       {toast && (
//         <div
//           className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-mono uppercase tracking-wider shadow-lg transition-all duration-300"
//           style={{
//             background: toast.type === "success" ? "#0d2b12" : "#2b0d0d",
//             border: `1px solid ${toast.type === "success" ? "#22c55e40" : "#e6394640"}`,
//             color: toast.type === "success" ? "#22c55e" : "#e63946",
//             maxWidth: "360px",
//           }}
//         >
//           <span>{toast.type === "success" ? "✓" : "✕"}</span>
//           <span>{toast.msg}</span>
//           <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100">×</button>
//         </div>
//       )}
//     </div>
//   );
// }
