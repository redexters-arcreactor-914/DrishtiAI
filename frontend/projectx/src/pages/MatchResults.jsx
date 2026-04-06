// import { useState, useEffect, useRef } from "react";

// const API = "http://127.0.0.1:5000";

// const fmt = (iso) => {
//   try {
//     return new Date(iso).toLocaleString("en-US", {
//       month: "short", day: "2-digit", year: "numeric",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return iso; }
// };

// const confColor = (pct) => {
//   if (pct >= 70) return { bar: "#22c55e", label: "HIGH", glow: "#22c55e55" };
//   if (pct >= 40) return { bar: "#eab308", label: "MED",  glow: "#eab30855" };
//   return              { bar: "#e63946", label: "LOW",  glow: "#e6394655" };
// };

// // normalise score to 0-100
// const toPercent = (score) => {
//   if (score == null) return 0;
//   if (score <= 1)   return Math.round(score * 100);
//   return Math.round(score);
// };

// // ── SKELETON ──────────────────────────────────────────────────────────────────
// function SkeletonMatch() {
//   return (
//     <div className="rounded-sm border border-white/10 p-5 space-y-4"
//          style={{ background: "rgba(255,255,255,0.02)" }}>
//       <div className="flex gap-2 justify-between">
//         <div className="h-3 w-32 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-3 w-20 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="flex gap-4">
//         <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="flex flex-col items-center justify-center w-10 gap-1">
//           <div className="h-3 w-8 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         </div>
//         <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="h-2 w-full rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       <div className="flex gap-3">
//         <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//     </div>
//   );
// }

// // ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
// function ConfirmDialog({ onConfirm, onCancel }) {
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center"
//          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
//       <div className="rounded-sm border border-white/10 p-6 space-y-4 max-w-sm w-full mx-4"
//            style={{ background: "#0f0f18" }}>
//         <div className="flex items-center gap-2">
//           <div className="w-1 h-5" style={{ background: "#e63946" }} />
//           <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
//             Authorization Required
//           </h3>
//         </div>
//         <p className="text-xs leading-relaxed font-mono" style={{ color: "#a0a0b8" }}>
//           You are about to reveal the identity of a match result. This action is logged
//           and subject to data protection protocols.
//         </p>
//         <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#e63946" }}>
//           Confirm you are an authorized officer?
//         </p>
//         <div className="flex gap-3 pt-1">
//           <button onClick={onConfirm}
//             className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
//             style={{ background: "linear-gradient(135deg,#e63946,#c1121f)", color: "#fff" }}>
//             Confirm & Reveal
//           </button>
//           <button onClick={onCancel}
//             className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
//             style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888" }}>
//             Cancel
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── MATCH CARD ────────────────────────────────────────────────────────────────
// function MatchCard({ match, idx, onStatusChange }) {
//   const [blurred, setBlurred]       = useState(true);
//   const [showDialog, setShowDialog] = useState(false);
//   const [visible, setVisible]       = useState(false);

//   const confidence = toPercent(match.score ?? match.confidence);
//   const { bar, label, glow } = confColor(confidence);

//   // pull extra data from match_data JSON blob if present
//   const extra = match.match_data || {};
//   const engines = extra.engines_used || [];

//   useEffect(() => {
//     const t = setTimeout(() => setVisible(true), idx * 100);
//     return () => clearTimeout(t);
//   }, [idx]);

//   const statusColors = {
//     pending:   { bg: "#1a1a24", border: "#ffffff18", text: "#666680" },
//     flagged:   { bg: "#0d2b12", border: "#22c55e40", text: "#22c55e" },
//     dismissed: { bg: "#2b0d0d", border: "#e6394640", text: "#e63946" },
//   };
//   const sc = statusColors[match.status || "pending"] || statusColors.pending;

//   return (
//     <>
//       {showDialog && (
//         <ConfirmDialog
//           onConfirm={() => { setBlurred(false); setShowDialog(false); }}
//           onCancel={() => setShowDialog(false)}
//         />
//       )}

//       <div
//         className="rounded-sm border overflow-hidden relative transition-all duration-500"
//         style={{
//           background: "rgba(255,255,255,0.025)",
//           opacity: visible ? 1 : 0,
//           transform: visible ? "translateY(0)" : "translateY(14px)",
//           borderColor: sc.border,
//         }}
//       >
//         {/* accent bar */}
//         <div className="h-px w-full"
//              style={{ background: `linear-gradient(90deg,${bar},transparent)` }} />

//         <div className="p-5 space-y-4">

//           {/* header */}
//           <div className="flex flex-wrap items-center justify-between gap-2">
//             <div className="flex items-center gap-2">
//               <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>
//                 MATCH #{String(idx + 1).padStart(2, "0")}
//               </span>
//               <span className="text-xs font-mono" style={{ color: "#44445a" }}>·</span>
//               <span className="text-xs font-mono" style={{ color: "#55556a" }}>
//                 {match.case_id?.slice(0, 8)}…
//               </span>
//             </div>
//             <span className="text-xs font-mono px-2 py-0.5 rounded-sm uppercase tracking-wider"
//                   style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>
//               {match.status || "pending"}
//             </span>
//           </div>

//           {/* meta */}
//           <div className="flex flex-wrap gap-4 text-xs font-mono" style={{ color: "#55556a" }}>
//             <span>🕐 {fmt(match.created_at)}</span>
//             {engines.length > 0 && (
//               <span style={{ color: "#6366f1" }}>⚙ {engines.join(" + ")}</span>
//             )}
//           </div>

//           {/* photos side by side */}
//           <div className="flex gap-3 items-stretch">
//             {/* reference photo */}
//             <div className="flex-1 space-y-1.5">
//               <p className="text-xs font-mono uppercase tracking-widest text-center"
//                  style={{ color: "#44445a" }}>Reference</p>
//               <div className="relative rounded-sm overflow-hidden"
//                    style={{ aspectRatio: "5/6", background: "#0f0f18" }}>
//                 {/* We can't serve actual photos without a /api/photo endpoint
//                     Show placeholder with case info instead */}
//                 <div className="w-full h-full flex flex-col items-center justify-center gap-2"
//                      style={{ background: "#0f0f18" }}>
//                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
//                        stroke="#333344" strokeWidth="1.5">
//                     <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
//                     <circle cx="12" cy="7" r="4"/>
//                   </svg>
//                   <span className="text-xs font-mono text-center px-2"
//                         style={{ color: "#33334a", fontSize: "9px" }}>
//                     REFERENCE PHOTO
//                   </span>
//                 </div>
//                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
//                      style={{ transform: "rotate(-35deg)" }}>
//                   <span className="text-xs font-mono font-bold uppercase tracking-widest select-none whitespace-nowrap"
//                         style={{ color: "rgba(255,255,255,0.08)", fontSize: "9px" }}>
//                     FOR AUTHORIZED USE ONLY
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* VS divider */}
//             <div className="flex flex-col items-center justify-center gap-2 w-8">
//               <div className="flex-1 w-px"
//                    style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
//               <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>VS</span>
//               <div className="flex-1 w-px"
//                    style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
//             </div>

//             {/* sighting photo */}
//             <div className="flex-1 space-y-1.5">
//               <p className="text-xs font-mono uppercase tracking-widest text-center"
//                  style={{ color: "#44445a" }}>Sighting</p>
//               <div className="relative rounded-sm overflow-hidden"
//                    style={{ aspectRatio: "5/6", background: "#0f0f18" }}>
//                 <div className="w-full h-full flex flex-col items-center justify-center gap-2">
//                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
//                        stroke="#333344" strokeWidth="1.5">
//                     <rect x="3" y="3" width="18" height="18" rx="2"/>
//                     <circle cx="8.5" cy="8.5" r="1.5"/>
//                     <polyline points="21 15 16 10 5 21"/>
//                   </svg>
//                   <span className="text-xs font-mono text-center px-2"
//                         style={{ color: "#33334a", fontSize: "9px" }}>
//                     SIGHTING PHOTO
//                   </span>
//                 </div>
//                 {[0, 1].map((i) => (
//                   <div key={i}
//                        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
//                        style={{ transform: `rotate(-35deg) translateY(${i * 40 - 20}px)` }}>
//                     <span className="font-mono font-bold uppercase whitespace-nowrap"
//                           style={{ color: "rgba(255,255,255,0.07)", fontSize: "8px" }}>
//                       FOR AUTHORIZED USE ONLY
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* confidence bar */}
//           <div className="space-y-1.5">
//             <div className="flex justify-between items-center">
//               <span className="text-xs font-mono" style={{ color: "#44445a" }}>
//                 FACE MATCH CONFIDENCE
//               </span>
//               <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
//                     style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}>
//                 {label} · {confidence}%
//               </span>
//             </div>
//             <div className="h-2 w-full rounded-sm overflow-hidden" style={{ background: "#1a1a24" }}>
//               <div className="h-full rounded-sm transition-all duration-1000"
//                    style={{
//                      width: `${confidence}%`,
//                      background: `linear-gradient(90deg,${bar}88,${bar})`,
//                      boxShadow: `0 0 10px ${glow}`,
//                    }} />
//             </div>
//           </div>

//           {/* reveal button */}
//           {blurred && (
//             <button onClick={() => setShowDialog(true)}
//               className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.01]"
//               style={{ background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.3)", color: "#e63946" }}>
//               <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
//                    stroke="currentColor" strokeWidth="2.5">
//                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
//                 <circle cx="12" cy="12" r="3"/>
//               </svg>
//               Reveal Case Details
//             </button>
//           )}

//           {/* revealed info */}
//           {!blurred && (
//             <div className="p-3 rounded-sm space-y-1"
//                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
//               <p className="text-xs font-mono" style={{ color: "#818cf8" }}>
//                 Case ID: {match.case_id}
//               </p>
//               <p className="text-xs font-mono" style={{ color: "#818cf8" }}>
//                 Sighting ID: {match.sighting_id}
//               </p>
//               <p className="text-xs font-mono" style={{ color: "#818cf8" }}>
//                 Score (raw): {match.score?.toFixed ? match.score.toFixed(4) : match.score}
//               </p>
//             </div>
//           )}

//           {/* action buttons */}
//           <div className="flex gap-3">
//             <button
//               onClick={() => onStatusChange(match.id, "flagged")}
//               disabled={match.status === "flagged" || match.status === "dismissed"}
//               className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
//               style={{
//                 background: match.status === "flagged" ? "#0d2b12" : "rgba(34,197,94,0.08)",
//                 border: "1px solid rgba(34,197,94,0.35)", color: "#22c55e",
//               }}>
//               <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
//                    stroke="currentColor" strokeWidth="2.5">
//                 <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
//                 <line x1="4" y1="22" x2="4" y2="15"/>
//               </svg>
//               {match.status === "flagged" ? "Flagged ✓" : "Flag Match"}
//             </button>

//             <button
//               onClick={() => onStatusChange(match.id, "dismissed")}
//               disabled={match.status === "flagged" || match.status === "dismissed"}
//               className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
//               style={{
//                 background: match.status === "dismissed" ? "#2b0d0d" : "rgba(230,57,70,0.06)",
//                 border: "1px solid rgba(230,57,70,0.3)", color: "#e63946",
//               }}>
//               <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
//                    stroke="currentColor" strokeWidth="2.5">
//                 <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
//               </svg>
//               {match.status === "dismissed" ? "Dismissed ✓" : "Dismiss"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// export default function MatchResults() {
//   const [matches, setMatches]     = useState([]);
//   const [cases, setCases]         = useState([]);
//   const [selectedCase, setSelected] = useState("");
//   const [loading, setLoading]     = useState(true);
//   const [running, setRunning]     = useState(false);
//   const [toast, setToast]         = useState(null);
//   const toastTimer = useRef(null);

//   const showToast = (type, msg) => {
//     clearTimeout(toastTimer.current);
//     setToast({ type, msg });
//     toastTimer.current = setTimeout(() => setToast(null), 4000);
//   };

//   // load cases for the dropdown
//   useEffect(() => {
//     fetch(`${API}/api/cases`)
//       .then(r => r.json())
//       .then(d => setCases(d.cases || []))
//       .catch(() => {});
//   }, []);

//   // load matches from real API
//   const loadMatches = async (caseId = "") => {
//     setLoading(true);
//     try {
//       const url = caseId
//         ? `${API}/api/matches?case_id=${caseId}&limit=20`
//         : `${API}/api/matches?limit=20`;
//       const res  = await fetch(url);
//       if (!res.ok) throw new Error();
//       const data = await res.json();
//       // API returns { matches: [...], total: N }
//       setMatches(data.matches || []);
//     } catch {
//       setMatches([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { loadMatches(); }, []);

//   // manually trigger face matching for selected case
//   const handleRunMatch = async () => {
//     if (!selectedCase) {
//       showToast("error", "Select a case first to run face matching.");
//       return;
//     }
//     setRunning(true);
//     try {
//       const res = await fetch(`${API}/api/match`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ case_id: selectedCase }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Match failed");

//       showToast("success",
//         data.matches?.length
//           ? `✓ ${data.matches.length} match(es) found for this case!`
//           : "No matches found — no sighting photos for this case yet."
//       );
//       await loadMatches(selectedCase);
//     } catch (e) {
//       showToast("error", e.message || "Face matching failed.");
//     } finally {
//       setRunning(false);
//     }
//   };

//   const handleStatusChange = (id, newStatus) => {
//     setMatches(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
//     showToast(
//       newStatus === "flagged" ? "success" : "error",
//       newStatus === "flagged"
//         ? "Match flagged. Case officer notified."
//         : "Match dismissed. Logged in audit trail."
//     );
//   };

//   const flagged   = matches.filter(m => m.status === "flagged").length;
//   const dismissed = matches.filter(m => m.status === "dismissed").length;
//   const pending   = matches.filter(m => !m.status || m.status === "pending").length;

//   return (
//     <div className="min-h-screen"
//          style={{ background: "#0a0a0f", fontFamily: "'Courier New', Courier, monospace" }}>
//       {/* scanlines */}
//       <div className="pointer-events-none fixed inset-0 z-0"
//            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)" }} />

//       <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

//         {/* ── HEADER ── */}
//         <div className="space-y-1">
//           <div className="flex items-center gap-3">
//             <div className="w-1 h-8" style={{ background: "#e63946" }} />
//             <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#ffffff" }}>
//               Facial Match Results
//             </h1>
//           </div>
//           <p className="text-xs pl-4 uppercase tracking-wider" style={{ color: "#44445a" }}>
//             AI-ASSISTED ANALYSIS · HUMAN VERIFICATION REQUIRED
//           </p>
//         </div>

//         {/* ── RUN MATCH PANEL ── */}
//         <div className="rounded-sm border border-white/10 p-4 space-y-3"
//              style={{ background: "rgba(255,255,255,0.025)" }}>
//           <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#e63946" }}>
//             ▸ Run Face Matching
//           </p>
//           <div className="flex gap-3">
//             <select
//               value={selectedCase}
//               onChange={e => { setSelected(e.target.value); loadMatches(e.target.value); }}
//               className="flex-1 bg-transparent text-xs font-mono rounded-sm px-3 py-2 outline-none"
//               style={{ background: "#0f0f18", border: "1px solid rgba(255,255,255,0.1)", color: "#a0a0b8" }}
//             >
//               <option value="">All cases</option>
//               {cases.map(c => (
//                 <option key={c.id} value={c.id} style={{ background: "#0f0f18" }}>
//                   {c.name} — {c.id.slice(0, 8)}…
//                 </option>
//               ))}
//             </select>
//             <button
//               onClick={handleRunMatch}
//               disabled={running || !selectedCase}
//               className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
//               style={{ background: "linear-gradient(135deg,#e63946,#c1121f)", color: "#fff" }}
//             >
//               {running ? (
//                 <>
//                   <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                     <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
//                     <path d="M12 2a10 10 0 0 1 10 10"/>
//                   </svg>
//                   Matching…
//                 </>
//               ) : (
//                 <>
//                   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                     <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
//                   </svg>
//                   Run Match
//                 </>
//               )}
//             </button>
//           </div>
//           <p className="text-xs font-mono" style={{ color: "#33334a" }}>
//             Select a case and click Run Match to compare its reference photo against all sighting photos.
//             Or submit a sighting WITH a photo from the Sighting Feed to trigger auto-matching.
//           </p>
//         </div>

//         {/* ── STATS ROW ── */}
//         {!loading && (
//           <div className="grid grid-cols-3 gap-3">
//             {[
//               { label: "Pending",   value: pending,   color: "#6366f1" },
//               { label: "Flagged",   value: flagged,   color: "#22c55e" },
//               { label: "Dismissed", value: dismissed, color: "#e63946" },
//             ].map(({ label, value, color }) => (
//               <div key={label} className="rounded-sm border border-white/10 p-3 text-center space-y-1"
//                    style={{ background: "rgba(255,255,255,0.025)" }}>
//                 <p className="text-2xl font-bold" style={{ color }}>{value}</p>
//                 <p className="text-xs uppercase tracking-widest" style={{ color: "#44445a" }}>{label}</p>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── SECTION LABEL ── */}
//         <div className="flex items-center gap-3">
//           <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
//             Candidate Matches
//           </span>
//           <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
//           <span className="text-xs font-mono" style={{ color: "#44445a" }}>
//             {matches.length} result{matches.length !== 1 ? "s" : ""}
//           </span>
//         </div>

//         {/* ── CARDS ── */}
//         <div className="space-y-6">
//           {loading ? (
//             Array.from({ length: 3 }).map((_, i) => <SkeletonMatch key={i} />)
//           ) : matches.length === 0 ? (
//             <div className="text-center py-16 space-y-2" style={{ color: "#44445a" }}>
//               <p className="text-xs uppercase tracking-widest">No match results yet</p>
//               <p className="text-xs opacity-60">
//                 Submit a sighting with a photo, or select a case above and click Run Match
//               </p>
//             </div>
//           ) : (
//             matches.map((m, i) => (
//               <MatchCard key={m.id} match={m} idx={i} onStatusChange={handleStatusChange} />
//             ))
//           )}
//         </div>

//         {/* ── LEGAL FOOTER ── */}
//         <div className="rounded-sm border p-4 text-center space-y-1"
//              style={{ background: "rgba(230,57,70,0.04)", borderColor: "rgba(230,57,70,0.15)" }}>
//           <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
//             ⚠ Restricted System Access
//           </p>
//           <p className="text-xs font-mono leading-relaxed" style={{ color: "#44445a" }}>
//             All actions are logged and audited. Results are AI-assisted and must be
//             verified by a qualified officer before action is taken.
//           </p>
//         </div>
//       </div>

//       {/* ── TOAST ── */}
//       {toast && (
//         <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-mono uppercase tracking-wider shadow-lg"
//              style={{
//                background: toast.type === "success" ? "#0d2b12" : "#2b0d0d",
//                border: `1px solid ${toast.type === "success" ? "#22c55e40" : "#e6394640"}`,
//                color: toast.type === "success" ? "#22c55e" : "#e63946",
//                maxWidth: "400px",
//              }}>
//           <span>{toast.type === "success" ? "✓" : "✕"}</span>
//           <span className="flex-1">{toast.msg}</span>
//           <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100">×</button>
//         </div>
//       )}
//     </div>
//   );
// }
// // import { useState, useEffect, useRef } from "react";

// // // ── MOCK DATA ─────────────────────────────────────────────────────────────────
// // const MOCK_MATCHES = [
// //   {
// //     id: "m001",
// //     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
// //     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
// //     confidence: 91,
// //     name: "REDACTED",
// //     caseId: "MPC-2025-0041",
// //     location: "Assi Ghat, Varanasi",
// //     date: "2025-04-03T14:22:00Z",
// //     status: "pending",
// //   },
// //   {
// //     id: "m002",
// //     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
// //     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
// //     confidence: 74,
// //     name: "REDACTED",
// //     caseId: "MPC-2025-0037",
// //     location: "Godowlia Chowk",
// //     date: "2025-04-03T09:45:00Z",
// //     status: "pending",
// //   },
// //   {
// //     id: "m003",
// //     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
// //     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
// //     confidence: 58,
// //     name: "REDACTED",
// //     caseId: "MPC-2025-0029",
// //     location: "Cantonment Station",
// //     date: "2025-04-02T23:10:00Z",
// //     status: "pending",
// //   },
// //   {
// //     id: "m004",
// //     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
// //     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
// //     confidence: 44,
// //     name: "REDACTED",
// //     caseId: "MPC-2025-0019",
// //     location: "Lanka Crossing",
// //     date: "2025-04-01T18:30:00Z",
// //     status: "pending",
// //   },
// //   {
// //     id: "m005",
// //     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
// //     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
// //     confidence: 29,
// //     name: "REDACTED",
// //     caseId: "MPC-2025-0011",
// //     location: "Rathyatra Road",
// //     date: "2025-03-31T07:15:00Z",
// //     status: "pending",
// //   },
// // ];

// // const fmt = (iso) => {
// //   try {
// //     return new Date(iso).toLocaleString("en-US", {
// //       month: "short", day: "2-digit", year: "numeric",
// //       hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch { return iso; }
// // };

// // const confColor = (pct) => {
// //   if (pct >= 70) return { bar: "#22c55e", label: "HIGH",  glow: "#22c55e55" };
// //   if (pct >= 40) return { bar: "#eab308", label: "MED",   glow: "#eab30855" };
// //   return              { bar: "#e63946", label: "LOW",   glow: "#e6394655" };
// // };

// // // ── SKELETON ─────────────────────────────────────────────────────────────────
// // function SkeletonMatch() {
// //   return (
// //     <div className="rounded-sm border border-white/10 p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)" }}>
// //       <div className="flex gap-2 justify-between">
// //         <div className="h-3 w-32 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //         <div className="h-3 w-20 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //       </div>
// //       <div className="flex gap-4">
// //         <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //         <div className="flex flex-col items-center justify-center w-10 gap-1">
// //           <div className="h-3 w-8 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //         </div>
// //         <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //       </div>
// //       <div className="h-2 w-full rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //       <div className="flex gap-3">
// //         <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //         <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
// //       </div>
// //     </div>
// //   );
// // }

// // // ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
// // function ConfirmDialog({ onConfirm, onCancel }) {
// //   return (
// //     <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
// //       <div
// //         className="rounded-sm border border-white/10 p-6 space-y-4 max-w-sm w-full mx-4"
// //         style={{ background: "#0f0f18" }}
// //       >
// //         <div className="flex items-center gap-2">
// //           <div className="w-1 h-5" style={{ background: "#e63946" }} />
// //           <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
// //             Authorization Required
// //           </h3>
// //         </div>
// //         <p className="text-xs leading-relaxed font-mono" style={{ color: "#a0a0b8" }}>
// //           You are about to reveal the identity of a match result. This action is logged and subject to data protection protocols.
// //         </p>
// //         <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#e63946" }}>
// //           Confirm you are an authorized officer?
// //         </p>
// //         <div className="flex gap-3 pt-1">
// //           <button
// //             onClick={onConfirm}
// //             className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
// //             style={{ background: "linear-gradient(135deg,#e63946,#c1121f)", color: "#fff" }}
// //           >
// //             Confirm & Reveal
// //           </button>
// //           <button
// //             onClick={onCancel}
// //             className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
// //             style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888" }}
// //           >
// //             Cancel
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // // ── MATCH CARD ────────────────────────────────────────────────────────────────
// // function MatchCard({ match, idx, onStatusChange }) {
// //   const [blurred, setBlurred] = useState(true);
// //   const [showDialog, setShowDialog] = useState(false);
// //   const [visible, setVisible] = useState(false);
// //   const { bar, label, glow } = confColor(match.confidence);

// //   useEffect(() => {
// //     const t = setTimeout(() => setVisible(true), idx * 100);
// //     return () => clearTimeout(t);
// //   }, [idx]);

// //   const handleReveal = () => setShowDialog(true);
// //   const handleConfirm = () => { setBlurred(false); setShowDialog(false); };
// //   const handleCancel  = () => setShowDialog(false);

// //   const statusColors = {
// //     pending:  { bg: "#1a1a24",  border: "#ffffff18", text: "#666680" },
// //     flagged:  { bg: "#0d2b12",  border: "#22c55e40", text: "#22c55e" },
// //     dismissed:{ bg: "#2b0d0d",  border: "#e6394640", text: "#e63946" },
// //   };
// //   const sc = statusColors[match.status] || statusColors.pending;

// //   return (
// //     <>
// //       {showDialog && <ConfirmDialog onConfirm={handleConfirm} onCancel={handleCancel} />}

// //       <div
// //         className="rounded-sm border border-white/10 overflow-hidden relative transition-all duration-500"
// //         style={{
// //           background: "rgba(255,255,255,0.025)",
// //           opacity: visible ? 1 : 0,
// //           transform: visible ? "translateY(0)" : "translateY(14px)",
// //           borderColor: sc.border,
// //         }}
// //       >
// //         {/* accent bar */}
// //         <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${bar},transparent)` }} />

// //         <div className="p-5 space-y-4">

// //           {/* header */}
// //           <div className="flex flex-wrap items-center justify-between gap-2">
// //             <div className="flex items-center gap-2">
// //               <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>
// //                 MATCH #{String(idx + 1).padStart(2, "0")}
// //               </span>
// //               <span className="text-xs font-mono" style={{ color: "#44445a" }}>·</span>
// //               <span className="text-xs font-mono" style={{ color: "#55556a" }}>{match.caseId}</span>
// //             </div>
// //             <span
// //               className="text-xs font-mono px-2 py-0.5 rounded-sm uppercase tracking-wider"
// //               style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
// //             >
// //               {match.status}
// //             </span>
// //           </div>

// //           {/* location + date */}
// //           <div className="flex flex-wrap gap-4 text-xs font-mono" style={{ color: "#55556a" }}>
// //             <span>📍 {match.location}</span>
// //             <span>🕐 {fmt(match.date)}</span>
// //           </div>

// //           {/* photos */}
// //           <div className="flex gap-3 items-stretch">
// //             {/* reference */}
// //             <div className="flex-1 space-y-1.5">
// //               <p className="text-xs font-mono uppercase tracking-widest text-center" style={{ color: "#44445a" }}>Reference</p>
// //               <div
// //                 className="relative rounded-sm overflow-hidden"
// //                 style={{ aspectRatio: "5/6", background: "#0f0f18" }}
// //               >
// //                 <img
// //                   src={match.referencePhoto}
// //                   alt="Reference"
// //                   className="w-full h-full object-cover transition-all duration-700"
// //                   style={{ filter: blurred ? "blur(8px) brightness(0.6)" : "none" }}
// //                 />
// //                 {/* watermark */}
// //                 <div
// //                   className="absolute inset-0 flex items-center justify-center pointer-events-none"
// //                   style={{ transform: "rotate(-35deg)" }}
// //                 >
// //                   <span
// //                     className="text-xs font-mono font-bold uppercase tracking-widest select-none whitespace-nowrap"
// //                     style={{ color: "rgba(255,255,255,0.12)", fontSize: "9px", letterSpacing: "0.2em" }}
// //                   >
// //                     FOR AUTHORIZED USE ONLY
// //                   </span>
// //                 </div>
// //                 <div
// //                   className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none"
// //                   style={{ transform: "rotate(-35deg)" }}
// //                 >
// //                   <span className="text-xs font-mono font-bold uppercase tracking-widest select-none" style={{ color: "rgba(255,255,255,0.06)", fontSize: "8px" }}>
// //                     CLASSIFIED
// //                   </span>
// //                 </div>
// //               </div>
// //             </div>

// //             {/* vs divider */}
// //             <div className="flex flex-col items-center justify-center gap-2 w-8">
// //               <div className="flex-1 w-px" style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
// //               <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>VS</span>
// //               <div className="flex-1 w-px" style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
// //             </div>

// //             {/* sighting */}
// //             <div className="flex-1 space-y-1.5">
// //               <p className="text-xs font-mono uppercase tracking-widest text-center" style={{ color: "#44445a" }}>Sighting</p>
// //               <div
// //                 className="relative rounded-sm overflow-hidden"
// //                 style={{ aspectRatio: "5/6", background: "#0f0f18" }}
// //               >
// //                 <img
// //                   src={match.sightingPhoto}
// //                   alt="Sighting"
// //                   className="w-full h-full object-cover transition-all duration-700"
// //                   style={{ filter: blurred ? "blur(8px) brightness(0.6)" : "none" }}
// //                 />
// //                 {/* watermark — repeated at angle */}
// //                 {[0, 1].map((i) => (
// //                   <div
// //                     key={i}
// //                     className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
// //                     style={{ transform: `rotate(-35deg) translateY(${i * 40 - 20}px)` }}
// //                   >
// //                     <span className="text-xs font-mono font-bold uppercase whitespace-nowrap" style={{ color: "rgba(255,255,255,0.10)", fontSize: "8px", letterSpacing: "0.2em" }}>
// //                       FOR AUTHORIZED USE ONLY
// //                     </span>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>
// //           </div>

// //           {/* confidence bar */}
// //           <div className="space-y-1.5">
// //             <div className="flex justify-between items-center">
// //               <span className="text-xs font-mono" style={{ color: "#44445a" }}>FACE MATCH CONFIDENCE</span>
// //               <span
// //                 className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
// //                 style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}
// //               >
// //                 {label} · {match.confidence}%
// //               </span>
// //             </div>
// //             <div className="h-2 w-full rounded-sm overflow-hidden" style={{ background: "#1a1a24" }}>
// //               <div
// //                 className="h-full rounded-sm transition-all duration-1000"
// //                 style={{
// //                   width: `${match.confidence}%`,
// //                   background: `linear-gradient(90deg,${bar}88,${bar})`,
// //                   boxShadow: `0 0 10px ${glow}`,
// //                 }}
// //               />
// //             </div>
// //           </div>

// //           {/* reveal button */}
// //           {blurred && (
// //             <button
// //               onClick={handleReveal}
// //               className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
// //               style={{
// //                 background: "rgba(230,57,70,0.08)",
// //                 border: "1px solid rgba(230,57,70,0.3)",
// //                 color: "#e63946",
// //               }}
// //             >
// //               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
// //                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
// //                 <circle cx="12" cy="12" r="3"/>
// //               </svg>
// //               Reveal Identity
// //             </button>
// //           )}

// //           {/* action buttons */}
// //           <div className="flex gap-3">
// //             <button
// //               onClick={() => onStatusChange(match.id, "flagged")}
// //               disabled={match.status !== "pending"}
// //               className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
// //               style={{
// //                 background: match.status === "flagged" ? "#0d2b12" : "rgba(34,197,94,0.08)",
// //                 border: "1px solid rgba(34,197,94,0.35)",
// //                 color: "#22c55e",
// //               }}
// //             >
// //               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
// //                 <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
// //               </svg>
// //               {match.status === "flagged" ? "Flagged ✓" : "Flag Match"}
// //             </button>

// //             <button
// //               onClick={() => onStatusChange(match.id, "dismissed")}
// //               disabled={match.status !== "pending"}
// //               className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
// //               style={{
// //                 background: match.status === "dismissed" ? "#2b0d0d" : "rgba(230,57,70,0.06)",
// //                 border: "1px solid rgba(230,57,70,0.3)",
// //                 color: "#e63946",
// //               }}
// //             >
// //               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
// //                 <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
// //               </svg>
// //               {match.status === "dismissed" ? "Dismissed ✓" : "Dismiss"}
// //             </button>
// //           </div>
// //         </div>
// //       </div>
// //     </>
// //   );
// // }

// // // ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// // export default function MatchResults() {
// //   const [matches, setMatches]   = useState([]);
// //   const [loading, setLoading]   = useState(true);
// //   const [toast, setToast]       = useState(null);
// //   const toastTimer = useRef(null);

// //   useEffect(() => {
// //     const load = async () => {
// //       setLoading(true);
// //       try {
// //         const res = await fetch("/api/matches");
// //         if (!res.ok) throw new Error();
// //         const data = await res.json();
// //         setMatches(data.slice(0, 5));
// //       } catch {
// //         await new Promise((r) => setTimeout(r, 1000));
// //         setMatches(MOCK_MATCHES);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };
// //     load();
// //   }, []);

// //   const showToast = (type, msg) => {
// //     clearTimeout(toastTimer.current);
// //     setToast({ type, msg });
// //     toastTimer.current = setTimeout(() => setToast(null), 3500);
// //   };

// //   const handleStatusChange = (id, newStatus) => {
// //     setMatches((prev) =>
// //       prev.map((m) => m.id === id ? { ...m, status: newStatus } : m)
// //     );
// //     showToast(
// //       newStatus === "flagged" ? "success" : "error",
// //       newStatus === "flagged"
// //         ? "Match flagged. Case officer has been notified."
// //         : "Match dismissed. Reason logged in audit trail."
// //     );
// //   };

// //   const flagged   = matches.filter((m) => m.status === "flagged").length;
// //   const dismissed = matches.filter((m) => m.status === "dismissed").length;
// //   const pending   = matches.filter((m) => m.status === "pending").length;

// //   return (
// //     <div
// //       className="min-h-screen"
// //       style={{
// //         background: "#0a0a0f",
// //         fontFamily: "'Courier New', Courier, monospace",
// //       }}
// //     >
// //       {/* scanlines */}
// //       <div
// //         className="pointer-events-none fixed inset-0 z-0"
// //         style={{
// //           backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)",
// //         }}
// //       />

// //       <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

// //         {/* ── HEADER ── */}
// //         <div className="space-y-1">
// //           <div className="flex items-center gap-3">
// //             <div className="w-1 h-8" style={{ background: "#e63946" }} />
// //             <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#ffffff" }}>
// //               Facial Match Results
// //             </h1>
// //           </div>
// //           <p className="text-xs pl-4 uppercase tracking-wider" style={{ color: "#44445a" }}>
// //             TOP-5 CANDIDATES · AI-ASSISTED ANALYSIS · HUMAN VERIFICATION REQUIRED
// //           </p>
// //         </div>

// //         {/* ── STATS ROW ── */}
// //         {!loading && (
// //           <div className="grid grid-cols-3 gap-3">
// //             {[
// //               { label: "Pending",   value: pending,   color: "#6366f1" },
// //               { label: "Flagged",   value: flagged,   color: "#22c55e" },
// //               { label: "Dismissed", value: dismissed, color: "#e63946" },
// //             ].map(({ label, value, color }) => (
// //               <div
// //                 key={label}
// //                 className="rounded-sm border border-white/10 p-3 text-center space-y-1"
// //                 style={{ background: "rgba(255,255,255,0.025)" }}
// //               >
// //                 <p className="text-2xl font-bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}</p>
// //                 <p className="text-xs uppercase tracking-widest" style={{ color: "#44445a" }}>{label}</p>
// //               </div>
// //             ))}
// //           </div>
// //         )}

// //         {/* ── SECTION LABEL ── */}
// //         <div className="flex items-center gap-3">
// //           <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
// //             Candidate Matches
// //           </span>
// //           <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
// //           <span className="text-xs font-mono" style={{ color: "#44445a" }}>BIOMETRIC · AI</span>
// //         </div>

// //         {/* ── CARDS ── */}
// //         <div className="space-y-6">
// //           {loading
// //             ? Array.from({ length: 3 }).map((_, i) => <SkeletonMatch key={i} />)
// //             : matches.map((m, i) => (
// //                 <MatchCard
// //                   key={m.id}
// //                   match={m}
// //                   idx={i}
// //                   onStatusChange={handleStatusChange}
// //                 />
// //               ))
// //           }
// //         </div>

// //         {/* ── LEGAL FOOTER ── */}
// //         <div
// //           className="rounded-sm border border-white/10 p-4 text-center space-y-1"
// //           style={{ background: "rgba(230,57,70,0.04)", borderColor: "rgba(230,57,70,0.15)" }}
// //         >
// //           <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
// //             ⚠ Restricted System Access
// //           </p>
// //           <p className="text-xs font-mono leading-relaxed" style={{ color: "#44445a" }}>
// //             All actions are logged and audited. Unauthorized use is a criminal offence.
// //             Results are AI-assisted and must be verified by a qualified officer before action is taken.
// //           </p>
// //         </div>
// //       </div>

// //       {/* ── TOAST ── */}
// //       {toast && (
// //         <div
// //           className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-mono uppercase tracking-wider shadow-lg"
// //           style={{
// //             background: toast.type === "success" ? "#0d2b12" : "#2b0d0d",
// //             border: `1px solid ${toast.type === "success" ? "#22c55e40" : "#e6394640"}`,
// //             color: toast.type === "success" ? "#22c55e" : "#e63946",
// //             maxWidth: "360px",
// //           }}
// //         >
// //           <span>{toast.type === "success" ? "✓" : "✕"}</span>
// //           <span className="flex-1">{toast.msg}</span>
// //           <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100">×</button>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }


import { useState, useEffect, useRef } from "react";

const API = "http://127.0.0.1:5000";

const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

const confColor = (pct) => {
  if (pct >= 70) return { bar: "#22c55e", label: "HIGH", glow: "#22c55e55" };
  if (pct >= 40) return { bar: "#eab308", label: "MED",  glow: "#eab30855" };
  return              { bar: "#e63946", label: "LOW",  glow: "#e6394655" };
};

// normalise score to 0-100
const toPercent = (score) => {
  if (score == null) return 0;
  if (score <= 1)   return Math.round(score * 100);
  return Math.round(score);
};

// ── SKELETON ──────────────────────────────────────────────────────────────────
function SkeletonMatch() {
  return (
    <div className="rounded-sm border border-white/10 p-5 space-y-4"
         style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex gap-2 justify-between">
        <div className="h-3 w-32 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        <div className="h-3 w-20 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
      </div>
      <div className="flex gap-4">
        <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        <div className="flex flex-col items-center justify-center w-10 gap-1">
          <div className="h-3 w-8 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        </div>
        <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
      </div>
      <div className="h-2 w-full rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
      <div className="flex gap-3">
        <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
        <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
      </div>
    </div>
  );
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-sm border border-white/10 p-6 space-y-4 max-w-sm w-full mx-4"
           style={{ background: "#0f0f18" }}>
        <div className="flex items-center gap-2">
          <div className="w-1 h-5" style={{ background: "#e63946" }} />
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
            Authorization Required
          </h3>
        </div>
        <p className="text-xs leading-relaxed font-mono" style={{ color: "#a0a0b8" }}>
          You are about to reveal the identity of a match result. This action is logged
          and subject to data protection protocols.
        </p>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#e63946" }}>
          Confirm you are an authorized officer?
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onConfirm}
            className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#e63946,#c1121f)", color: "#fff" }}>
            Confirm & Reveal
          </button>
          <button onClick={onCancel}
            className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MATCH CARD ────────────────────────────────────────────────────────────────
function MatchCard({ match, idx, onStatusChange }) {
  const [blurred, setBlurred]       = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [visible, setVisible]       = useState(false);

  const confidence = toPercent(match.score ?? match.confidence);
  const { bar, label, glow } = confColor(confidence);

  // pull extra data from match_data JSON blob if present
  const extra = match.match_data || {};
  const engines = extra.engines_used || [];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), idx * 100);
    return () => clearTimeout(t);
  }, [idx]);

  const statusColors = {
    pending:   { bg: "#1a1a24", border: "#ffffff18", text: "#666680" },
    flagged:   { bg: "#0d2b12", border: "#22c55e40", text: "#22c55e" },
    dismissed: { bg: "#2b0d0d", border: "#e6394640", text: "#e63946" },
  };
  const sc = statusColors[match.status || "pending"] || statusColors.pending;

  return (
    <>
      {showDialog && (
        <ConfirmDialog
          onConfirm={() => { setBlurred(false); setShowDialog(false); }}
          onCancel={() => setShowDialog(false)}
        />
      )}

      <div
        className="rounded-sm border overflow-hidden relative transition-all duration-500"
        style={{
          background: "rgba(255,255,255,0.025)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(14px)",
          borderColor: sc.border,
        }}
      >
        {/* accent bar */}
        <div className="h-px w-full"
             style={{ background: `linear-gradient(90deg,${bar},transparent)` }} />

        <div className="p-5 space-y-4">

          {/* header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>
                MATCH #{String(idx + 1).padStart(2, "0")}
              </span>
              <span className="text-xs font-mono" style={{ color: "#44445a" }}>·</span>
              <span className="text-xs font-mono" style={{ color: "#55556a" }}>
                {match.case_id?.slice(0, 8)}…
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm uppercase tracking-wider"
                  style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>
              {match.status || "pending"}
            </span>
          </div>

          {/* meta */}
          <div className="flex flex-wrap gap-4 text-xs font-mono" style={{ color: "#55556a" }}>
            <span>🕐 {fmt(match.created_at)}</span>
            {engines.length > 0 && (
              <span style={{ color: "#6366f1" }}>⚙ {engines.join(" + ")}</span>
            )}
          </div>

          {/* photos side by side */}
          <div className="flex gap-3 items-stretch">
            {/* reference photo */}
            <div className="flex-1 space-y-1.5">
              <p className="text-xs font-mono uppercase tracking-widest text-center"
                 style={{ color: "#44445a" }}>Reference</p>
              <div className="relative rounded-sm overflow-hidden"
                   style={{ aspectRatio: "5/6", background: "#0f0f18" }}>
                {extra.reference_photo ? (
                  <img
                    src={`${API}/api/photo/${extra.reference_photo}`}
                    alt="Reference"
                    className="w-full h-full object-cover"
                    style={{ filter: blurred ? "blur(14px) brightness(0.4)" : "none", transition: "filter 0.5s" }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                         stroke="#333344" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span className="font-mono text-center px-2"
                          style={{ color: "#33334a", fontSize: "9px" }}>
                      NO PHOTO
                    </span>
                  </div>
                )}
                {blurred && extra.reference_photo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                       style={{ transform: "rotate(-35deg)" }}>
                    <span className="font-mono font-bold uppercase tracking-widest select-none whitespace-nowrap"
                          style={{ color: "rgba(255,255,255,0.25)", fontSize: "9px" }}>
                      FOR AUTHORIZED USE ONLY
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* VS divider */}
            <div className="flex flex-col items-center justify-center gap-2 w-8">
              <div className="flex-1 w-px"
                   style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
              <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>VS</span>
              <div className="flex-1 w-px"
                   style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
            </div>

            {/* sighting photo */}
            <div className="flex-1 space-y-1.5">
              <p className="text-xs font-mono uppercase tracking-widest text-center"
                 style={{ color: "#44445a" }}>Sighting</p>
              <div className="relative rounded-sm overflow-hidden"
                   style={{ aspectRatio: "5/6", background: "#0f0f18" }}>
                {extra.sighting_photo ? (
                  <img
                    src={`${API}/api/photo/${extra.sighting_photo}`}
                    alt="Sighting"
                    className="w-full h-full object-cover"
                    style={{ filter: blurred ? "blur(14px) brightness(0.4)" : "none", transition: "filter 0.5s" }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                         stroke="#333344" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="font-mono text-center px-2"
                          style={{ color: "#33334a", fontSize: "9px" }}>
                      NO PHOTO
                    </span>
                  </div>
                )}
                {blurred && extra.sighting_photo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                       style={{ transform: "rotate(-35deg)" }}>
                    <span className="font-mono font-bold uppercase tracking-widest select-none whitespace-nowrap"
                          style={{ color: "rgba(255,255,255,0.25)", fontSize: "9px" }}>
                      FOR AUTHORIZED USE ONLY
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* confidence bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono" style={{ color: "#44445a" }}>
                FACE MATCH CONFIDENCE
              </span>
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
                    style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}>
                {label} · {confidence}%
              </span>
            </div>
            <div className="h-2 w-full rounded-sm overflow-hidden" style={{ background: "#1a1a24" }}>
              <div className="h-full rounded-sm transition-all duration-1000"
                   style={{
                     width: `${confidence}%`,
                     background: `linear-gradient(90deg,${bar}88,${bar})`,
                     boxShadow: `0 0 10px ${glow}`,
                   }} />
            </div>
          </div>

          {/* reveal button */}
          {blurred && (
            <button onClick={() => setShowDialog(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.01]"
              style={{ background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.3)", color: "#e63946" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Reveal Case Details
            </button>
          )}

          {/* revealed info */}
          {!blurred && (
            <div className="p-3 rounded-sm space-y-1"
                 style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <p className="text-xs font-mono" style={{ color: "#818cf8" }}>
                Case ID: {match.case_id}
              </p>
              <p className="text-xs font-mono" style={{ color: "#818cf8" }}>
                Sighting ID: {match.sighting_id}
              </p>
              <p className="text-xs font-mono" style={{ color: "#818cf8" }}>
                Score (raw): {match.score?.toFixed ? match.score.toFixed(4) : match.score}
              </p>
            </div>
          )}

          {/* action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onStatusChange(match.id, "flagged")}
              disabled={match.status === "flagged" || match.status === "dismissed"}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: match.status === "flagged" ? "#0d2b12" : "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.35)", color: "#22c55e",
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              {match.status === "flagged" ? "Flagged ✓" : "Flag Match"}
            </button>

            <button
              onClick={() => onStatusChange(match.id, "dismissed")}
              disabled={match.status === "flagged" || match.status === "dismissed"}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: match.status === "dismissed" ? "#2b0d0d" : "rgba(230,57,70,0.06)",
                border: "1px solid rgba(230,57,70,0.3)", color: "#e63946",
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {match.status === "dismissed" ? "Dismissed ✓" : "Dismiss"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MatchResults() {
  const [matches, setMatches]     = useState([]);
  const [cases, setCases]         = useState([]);
  const [selectedCase, setSelected] = useState("");
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [toast, setToast]         = useState(null);
  const toastTimer = useRef(null);

  const showToast = (type, msg) => {
    clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // load cases for the dropdown
  useEffect(() => {
    fetch(`${API}/api/cases`)
      .then(r => r.json())
      .then(d => setCases(d.cases || []))
      .catch(() => {});
  }, []);

  // load matches from real API
  const loadMatches = async (caseId = "") => {
    setLoading(true);
    try {
      const url = caseId
        ? `${API}/api/matches?case_id=${caseId}&limit=20`
        : `${API}/api/matches?limit=20`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      // API returns { matches: [...], total: N }
      setMatches(data.matches || []);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMatches(); }, []);

  // manually trigger face matching for selected case
  const handleRunMatch = async () => {
    if (!selectedCase) {
      showToast("error", "Select a case first to run face matching.");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch(`${API}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: selectedCase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Match failed");

      showToast("success",
        data.matches?.length
          ? `✓ ${data.matches.length} match(es) found for this case!`
          : "No matches found — no sighting photos for this case yet."
      );
      await loadMatches(selectedCase);
    } catch (e) {
      showToast("error", e.message || "Face matching failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    showToast(
      newStatus === "flagged" ? "success" : "error",
      newStatus === "flagged"
        ? "Match flagged. Case officer notified."
        : "Match dismissed. Logged in audit trail."
    );
  };

  const flagged   = matches.filter(m => m.status === "flagged").length;
  const dismissed = matches.filter(m => m.status === "dismissed").length;
  const pending   = matches.filter(m => !m.status || m.status === "pending").length;

  return (
    <div className="min-h-screen"
         style={{ background: "#0a0a0f", fontFamily: "'Courier New', Courier, monospace" }}>
      {/* scanlines */}
      <div className="pointer-events-none fixed inset-0 z-0"
           style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* ── HEADER ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8" style={{ background: "#e63946" }} />
            <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#ffffff" }}>
              Facial Match Results
            </h1>
          </div>
          <p className="text-xs pl-4 uppercase tracking-wider" style={{ color: "#44445a" }}>
            AI-ASSISTED ANALYSIS · HUMAN VERIFICATION REQUIRED
          </p>
        </div>

        {/* ── RUN MATCH PANEL ── */}
        <div className="rounded-sm border border-white/10 p-4 space-y-3"
             style={{ background: "rgba(255,255,255,0.025)" }}>
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#e63946" }}>
            ▸ Run Face Matching
          </p>
          <div className="flex gap-3">
            <select
              value={selectedCase}
              onChange={e => { setSelected(e.target.value); loadMatches(e.target.value); }}
              className="flex-1 bg-transparent text-xs font-mono rounded-sm px-3 py-2 outline-none"
              style={{ background: "#0f0f18", border: "1px solid rgba(255,255,255,0.1)", color: "#a0a0b8" }}
            >
              <option value="">All cases</option>
              {cases.map(c => (
                <option key={c.id} value={c.id} style={{ background: "#0f0f18" }}>
                  {c.name} — {c.id.slice(0, 8)}…
                </option>
              ))}
            </select>
            <button
              onClick={handleRunMatch}
              disabled={running || !selectedCase}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#e63946,#c1121f)", color: "#fff" }}
            >
              {running ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  Matching…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  Run Match
                </>
              )}
            </button>
          </div>
          <p className="text-xs font-mono" style={{ color: "#33334a" }}>
            Select a case and click Run Match to compare its reference photo against all sighting photos.
            Or submit a sighting WITH a photo from the Sighting Feed to trigger auto-matching.
          </p>
        </div>

        {/* ── STATS ROW ── */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pending",   value: pending,   color: "#6366f1" },
              { label: "Flagged",   value: flagged,   color: "#22c55e" },
              { label: "Dismissed", value: dismissed, color: "#e63946" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-sm border border-white/10 p-3 text-center space-y-1"
                   style={{ background: "rgba(255,255,255,0.025)" }}>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: "#44445a" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── SECTION LABEL ── */}
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
            Candidate Matches
          </span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
          <span className="text-xs font-mono" style={{ color: "#44445a" }}>
            {matches.length} result{matches.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── CARDS ── */}
        <div className="space-y-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonMatch key={i} />)
          ) : matches.length === 0 ? (
            <div className="text-center py-16 space-y-2" style={{ color: "#44445a" }}>
              <p className="text-xs uppercase tracking-widest">No match results yet</p>
              <p className="text-xs opacity-60">
                Submit a sighting with a photo, or select a case above and click Run Match
              </p>
            </div>
          ) : (
            matches.map((m, i) => (
              <MatchCard key={m.id} match={m} idx={i} onStatusChange={handleStatusChange} />
            ))
          )}
        </div>

        {/* ── LEGAL FOOTER ── */}
        <div className="rounded-sm border p-4 text-center space-y-1"
             style={{ background: "rgba(230,57,70,0.04)", borderColor: "rgba(230,57,70,0.15)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
            ⚠ Restricted System Access
          </p>
          <p className="text-xs font-mono leading-relaxed" style={{ color: "#44445a" }}>
            All actions are logged and audited. Results are AI-assisted and must be
            verified by a qualified officer before action is taken.
          </p>
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-mono uppercase tracking-wider shadow-lg"
             style={{
               background: toast.type === "success" ? "#0d2b12" : "#2b0d0d",
               border: `1px solid ${toast.type === "success" ? "#22c55e40" : "#e6394640"}`,
               color: toast.type === "success" ? "#22c55e" : "#e63946",
               maxWidth: "400px",
             }}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100">×</button>
        </div>
      )}
    </div>
  );
}
// import { useState, useEffect, useRef } from "react";

// // ── MOCK DATA ─────────────────────────────────────────────────────────────────
// const MOCK_MATCHES = [
//   {
//     id: "m001",
//     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
//     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
//     confidence: 91,
//     name: "REDACTED",
//     caseId: "MPC-2025-0041",
//     location: "Assi Ghat, Varanasi",
//     date: "2025-04-03T14:22:00Z",
//     status: "pending",
//   },
//   {
//     id: "m002",
//     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
//     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
//     confidence: 74,
//     name: "REDACTED",
//     caseId: "MPC-2025-0037",
//     location: "Godowlia Chowk",
//     date: "2025-04-03T09:45:00Z",
//     status: "pending",
//   },
//   {
//     id: "m003",
//     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
//     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
//     confidence: 58,
//     name: "REDACTED",
//     caseId: "MPC-2025-0029",
//     location: "Cantonment Station",
//     date: "2025-04-02T23:10:00Z",
//     status: "pending",
//   },
//   {
//     id: "m004",
//     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
//     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
//     confidence: 44,
//     name: "REDACTED",
//     caseId: "MPC-2025-0019",
//     location: "Lanka Crossing",
//     date: "2025-04-01T18:30:00Z",
//     status: "pending",
//   },
//   {
//     id: "m005",
//     referencePhoto: "https://placehold.co/200x240/1a1a24/44445a?text=REF+PHOTO",
//     sightingPhoto:  "https://placehold.co/200x240/1a1a24/44445a?text=SIGHTING",
//     confidence: 29,
//     name: "REDACTED",
//     caseId: "MPC-2025-0011",
//     location: "Rathyatra Road",
//     date: "2025-03-31T07:15:00Z",
//     status: "pending",
//   },
// ];

// const fmt = (iso) => {
//   try {
//     return new Date(iso).toLocaleString("en-US", {
//       month: "short", day: "2-digit", year: "numeric",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return iso; }
// };

// const confColor = (pct) => {
//   if (pct >= 70) return { bar: "#22c55e", label: "HIGH",  glow: "#22c55e55" };
//   if (pct >= 40) return { bar: "#eab308", label: "MED",   glow: "#eab30855" };
//   return              { bar: "#e63946", label: "LOW",   glow: "#e6394655" };
// };

// // ── SKELETON ─────────────────────────────────────────────────────────────────
// function SkeletonMatch() {
//   return (
//     <div className="rounded-sm border border-white/10 p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)" }}>
//       <div className="flex gap-2 justify-between">
//         <div className="h-3 w-32 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-3 w-20 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="flex gap-4">
//         <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="flex flex-col items-center justify-center w-10 gap-1">
//           <div className="h-3 w-8 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         </div>
//         <div className="h-44 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//       <div className="h-2 w-full rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       <div className="flex gap-3">
//         <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//         <div className="h-8 flex-1 rounded-sm animate-pulse" style={{ background: "#1a1a24" }} />
//       </div>
//     </div>
//   );
// }

// // ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
// function ConfirmDialog({ onConfirm, onCancel }) {
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
//       <div
//         className="rounded-sm border border-white/10 p-6 space-y-4 max-w-sm w-full mx-4"
//         style={{ background: "#0f0f18" }}
//       >
//         <div className="flex items-center gap-2">
//           <div className="w-1 h-5" style={{ background: "#e63946" }} />
//           <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
//             Authorization Required
//           </h3>
//         </div>
//         <p className="text-xs leading-relaxed font-mono" style={{ color: "#a0a0b8" }}>
//           You are about to reveal the identity of a match result. This action is logged and subject to data protection protocols.
//         </p>
//         <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#e63946" }}>
//           Confirm you are an authorized officer?
//         </p>
//         <div className="flex gap-3 pt-1">
//           <button
//             onClick={onConfirm}
//             className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
//             style={{ background: "linear-gradient(135deg,#e63946,#c1121f)", color: "#fff" }}
//           >
//             Confirm & Reveal
//           </button>
//           <button
//             onClick={onCancel}
//             className="flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all hover:scale-105"
//             style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888" }}
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── MATCH CARD ────────────────────────────────────────────────────────────────
// function MatchCard({ match, idx, onStatusChange }) {
//   const [blurred, setBlurred] = useState(true);
//   const [showDialog, setShowDialog] = useState(false);
//   const [visible, setVisible] = useState(false);
//   const { bar, label, glow } = confColor(match.confidence);

//   useEffect(() => {
//     const t = setTimeout(() => setVisible(true), idx * 100);
//     return () => clearTimeout(t);
//   }, [idx]);

//   const handleReveal = () => setShowDialog(true);
//   const handleConfirm = () => { setBlurred(false); setShowDialog(false); };
//   const handleCancel  = () => setShowDialog(false);

//   const statusColors = {
//     pending:  { bg: "#1a1a24",  border: "#ffffff18", text: "#666680" },
//     flagged:  { bg: "#0d2b12",  border: "#22c55e40", text: "#22c55e" },
//     dismissed:{ bg: "#2b0d0d",  border: "#e6394640", text: "#e63946" },
//   };
//   const sc = statusColors[match.status] || statusColors.pending;

//   return (
//     <>
//       {showDialog && <ConfirmDialog onConfirm={handleConfirm} onCancel={handleCancel} />}

//       <div
//         className="rounded-sm border border-white/10 overflow-hidden relative transition-all duration-500"
//         style={{
//           background: "rgba(255,255,255,0.025)",
//           opacity: visible ? 1 : 0,
//           transform: visible ? "translateY(0)" : "translateY(14px)",
//           borderColor: sc.border,
//         }}
//       >
//         {/* accent bar */}
//         <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${bar},transparent)` }} />

//         <div className="p-5 space-y-4">

//           {/* header */}
//           <div className="flex flex-wrap items-center justify-between gap-2">
//             <div className="flex items-center gap-2">
//               <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>
//                 MATCH #{String(idx + 1).padStart(2, "0")}
//               </span>
//               <span className="text-xs font-mono" style={{ color: "#44445a" }}>·</span>
//               <span className="text-xs font-mono" style={{ color: "#55556a" }}>{match.caseId}</span>
//             </div>
//             <span
//               className="text-xs font-mono px-2 py-0.5 rounded-sm uppercase tracking-wider"
//               style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
//             >
//               {match.status}
//             </span>
//           </div>

//           {/* location + date */}
//           <div className="flex flex-wrap gap-4 text-xs font-mono" style={{ color: "#55556a" }}>
//             <span>📍 {match.location}</span>
//             <span>🕐 {fmt(match.date)}</span>
//           </div>

//           {/* photos */}
//           <div className="flex gap-3 items-stretch">
//             {/* reference */}
//             <div className="flex-1 space-y-1.5">
//               <p className="text-xs font-mono uppercase tracking-widest text-center" style={{ color: "#44445a" }}>Reference</p>
//               <div
//                 className="relative rounded-sm overflow-hidden"
//                 style={{ aspectRatio: "5/6", background: "#0f0f18" }}
//               >
//                 <img
//                   src={match.referencePhoto}
//                   alt="Reference"
//                   className="w-full h-full object-cover transition-all duration-700"
//                   style={{ filter: blurred ? "blur(8px) brightness(0.6)" : "none" }}
//                 />
//                 {/* watermark */}
//                 <div
//                   className="absolute inset-0 flex items-center justify-center pointer-events-none"
//                   style={{ transform: "rotate(-35deg)" }}
//                 >
//                   <span
//                     className="text-xs font-mono font-bold uppercase tracking-widest select-none whitespace-nowrap"
//                     style={{ color: "rgba(255,255,255,0.12)", fontSize: "9px", letterSpacing: "0.2em" }}
//                   >
//                     FOR AUTHORIZED USE ONLY
//                   </span>
//                 </div>
//                 <div
//                   className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none"
//                   style={{ transform: "rotate(-35deg)" }}
//                 >
//                   <span className="text-xs font-mono font-bold uppercase tracking-widest select-none" style={{ color: "rgba(255,255,255,0.06)", fontSize: "8px" }}>
//                     CLASSIFIED
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* vs divider */}
//             <div className="flex flex-col items-center justify-center gap-2 w-8">
//               <div className="flex-1 w-px" style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
//               <span className="text-xs font-mono font-bold" style={{ color: "#e63946" }}>VS</span>
//               <div className="flex-1 w-px" style={{ background: "linear-gradient(180deg,transparent,#e63946,transparent)" }} />
//             </div>

//             {/* sighting */}
//             <div className="flex-1 space-y-1.5">
//               <p className="text-xs font-mono uppercase tracking-widest text-center" style={{ color: "#44445a" }}>Sighting</p>
//               <div
//                 className="relative rounded-sm overflow-hidden"
//                 style={{ aspectRatio: "5/6", background: "#0f0f18" }}
//               >
//                 <img
//                   src={match.sightingPhoto}
//                   alt="Sighting"
//                   className="w-full h-full object-cover transition-all duration-700"
//                   style={{ filter: blurred ? "blur(8px) brightness(0.6)" : "none" }}
//                 />
//                 {/* watermark — repeated at angle */}
//                 {[0, 1].map((i) => (
//                   <div
//                     key={i}
//                     className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
//                     style={{ transform: `rotate(-35deg) translateY(${i * 40 - 20}px)` }}
//                   >
//                     <span className="text-xs font-mono font-bold uppercase whitespace-nowrap" style={{ color: "rgba(255,255,255,0.10)", fontSize: "8px", letterSpacing: "0.2em" }}>
//                       FOR AUTHORIZED USE ONLY
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* confidence bar */}
//           <div className="space-y-1.5">
//             <div className="flex justify-between items-center">
//               <span className="text-xs font-mono" style={{ color: "#44445a" }}>FACE MATCH CONFIDENCE</span>
//               <span
//                 className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm"
//                 style={{ color: bar, background: `${bar}18`, border: `1px solid ${bar}30` }}
//               >
//                 {label} · {match.confidence}%
//               </span>
//             </div>
//             <div className="h-2 w-full rounded-sm overflow-hidden" style={{ background: "#1a1a24" }}>
//               <div
//                 className="h-full rounded-sm transition-all duration-1000"
//                 style={{
//                   width: `${match.confidence}%`,
//                   background: `linear-gradient(90deg,${bar}88,${bar})`,
//                   boxShadow: `0 0 10px ${glow}`,
//                 }}
//               />
//             </div>
//           </div>

//           {/* reveal button */}
//           {blurred && (
//             <button
//               onClick={handleReveal}
//               className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
//               style={{
//                 background: "rgba(230,57,70,0.08)",
//                 border: "1px solid rgba(230,57,70,0.3)",
//                 color: "#e63946",
//               }}
//             >
//               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
//                 <circle cx="12" cy="12" r="3"/>
//               </svg>
//               Reveal Identity
//             </button>
//           )}

//           {/* action buttons */}
//           <div className="flex gap-3">
//             <button
//               onClick={() => onStatusChange(match.id, "flagged")}
//               disabled={match.status !== "pending"}
//               className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
//               style={{
//                 background: match.status === "flagged" ? "#0d2b12" : "rgba(34,197,94,0.08)",
//                 border: "1px solid rgba(34,197,94,0.35)",
//                 color: "#22c55e",
//               }}
//             >
//               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                 <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
//               </svg>
//               {match.status === "flagged" ? "Flagged ✓" : "Flag Match"}
//             </button>

//             <button
//               onClick={() => onStatusChange(match.id, "dismissed")}
//               disabled={match.status !== "pending"}
//               className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
//               style={{
//                 background: match.status === "dismissed" ? "#2b0d0d" : "rgba(230,57,70,0.06)",
//                 border: "1px solid rgba(230,57,70,0.3)",
//                 color: "#e63946",
//               }}
//             >
//               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                 <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
//               </svg>
//               {match.status === "dismissed" ? "Dismissed ✓" : "Dismiss"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// export default function MatchResults() {
//   const [matches, setMatches]   = useState([]);
//   const [loading, setLoading]   = useState(true);
//   const [toast, setToast]       = useState(null);
//   const toastTimer = useRef(null);

//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       try {
//         const res = await fetch("/api/matches");
//         if (!res.ok) throw new Error();
//         const data = await res.json();
//         setMatches(data.slice(0, 5));
//       } catch {
//         await new Promise((r) => setTimeout(r, 1000));
//         setMatches(MOCK_MATCHES);
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, []);

//   const showToast = (type, msg) => {
//     clearTimeout(toastTimer.current);
//     setToast({ type, msg });
//     toastTimer.current = setTimeout(() => setToast(null), 3500);
//   };

//   const handleStatusChange = (id, newStatus) => {
//     setMatches((prev) =>
//       prev.map((m) => m.id === id ? { ...m, status: newStatus } : m)
//     );
//     showToast(
//       newStatus === "flagged" ? "success" : "error",
//       newStatus === "flagged"
//         ? "Match flagged. Case officer has been notified."
//         : "Match dismissed. Reason logged in audit trail."
//     );
//   };

//   const flagged   = matches.filter((m) => m.status === "flagged").length;
//   const dismissed = matches.filter((m) => m.status === "dismissed").length;
//   const pending   = matches.filter((m) => m.status === "pending").length;

//   return (
//     <div
//       className="min-h-screen"
//       style={{
//         background: "#0a0a0f",
//         fontFamily: "'Courier New', Courier, monospace",
//       }}
//     >
//       {/* scanlines */}
//       <div
//         className="pointer-events-none fixed inset-0 z-0"
//         style={{
//           backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)",
//         }}
//       />

//       <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

//         {/* ── HEADER ── */}
//         <div className="space-y-1">
//           <div className="flex items-center gap-3">
//             <div className="w-1 h-8" style={{ background: "#e63946" }} />
//             <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#ffffff" }}>
//               Facial Match Results
//             </h1>
//           </div>
//           <p className="text-xs pl-4 uppercase tracking-wider" style={{ color: "#44445a" }}>
//             TOP-5 CANDIDATES · AI-ASSISTED ANALYSIS · HUMAN VERIFICATION REQUIRED
//           </p>
//         </div>

//         {/* ── STATS ROW ── */}
//         {!loading && (
//           <div className="grid grid-cols-3 gap-3">
//             {[
//               { label: "Pending",   value: pending,   color: "#6366f1" },
//               { label: "Flagged",   value: flagged,   color: "#22c55e" },
//               { label: "Dismissed", value: dismissed, color: "#e63946" },
//             ].map(({ label, value, color }) => (
//               <div
//                 key={label}
//                 className="rounded-sm border border-white/10 p-3 text-center space-y-1"
//                 style={{ background: "rgba(255,255,255,0.025)" }}
//               >
//                 <p className="text-2xl font-bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}</p>
//                 <p className="text-xs uppercase tracking-widest" style={{ color: "#44445a" }}>{label}</p>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── SECTION LABEL ── */}
//         <div className="flex items-center gap-3">
//           <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "#e63946" }}>
//             Candidate Matches
//           </span>
//           <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,#e63946,transparent)" }} />
//           <span className="text-xs font-mono" style={{ color: "#44445a" }}>BIOMETRIC · AI</span>
//         </div>

//         {/* ── CARDS ── */}
//         <div className="space-y-6">
//           {loading
//             ? Array.from({ length: 3 }).map((_, i) => <SkeletonMatch key={i} />)
//             : matches.map((m, i) => (
//                 <MatchCard
//                   key={m.id}
//                   match={m}
//                   idx={i}
//                   onStatusChange={handleStatusChange}
//                 />
//               ))
//           }
//         </div>

//         {/* ── LEGAL FOOTER ── */}
//         <div
//           className="rounded-sm border border-white/10 p-4 text-center space-y-1"
//           style={{ background: "rgba(230,57,70,0.04)", borderColor: "rgba(230,57,70,0.15)" }}
//         >
//           <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#e63946" }}>
//             ⚠ Restricted System Access
//           </p>
//           <p className="text-xs font-mono leading-relaxed" style={{ color: "#44445a" }}>
//             All actions are logged and audited. Unauthorized use is a criminal offence.
//             Results are AI-assisted and must be verified by a qualified officer before action is taken.
//           </p>
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
//             maxWidth: "360px",
//           }}
//         >
//           <span>{toast.type === "success" ? "✓" : "✕"}</span>
//           <span className="flex-1">{toast.msg}</span>
//           <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100">×</button>
//         </div>
//       )}
//     </div>
//   );
// }