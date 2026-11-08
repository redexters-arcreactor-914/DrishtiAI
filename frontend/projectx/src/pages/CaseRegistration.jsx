




// CaseRegistration.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained Case Registration page for the Missing Persons AI Dashboard.
// No external UI libraries. Tailwind CSS only for layout utilities.
// All custom styling via inline styles + CSS-in-JS patterns.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";

// Local (not UTC) YYYY-MM-DD — toISOString() gives yesterday's date in IST before 05:30
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg0: "#0a0a0f",
  bg1: "#0f0f17",
  bg2: "#14141f",
  bg3: "#1a1a28",
  bg4: "#1e1e2e",
  accent: "#e63946",
  accentDim: "rgba(230,57,70,0.12)",
  accentGlow: "rgba(230,57,70,0.25)",
  accentBorder: "rgba(230,57,70,0.35)",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  txt: "#f0f0f5",
  txt2: "#9090b0",
  txt3: "#50506a",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  greenBorder: "rgba(34,197,94,0.3)",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  display: "'Syne', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
};

// ── Inject keyframes once ────────────────────────────────────────────────────
const STYLES_ID = "cr-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLES_ID)) {
  const s = document.createElement("style");
  s.id = STYLES_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    @keyframes cr-fadein  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
    @keyframes cr-slideup { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
    @keyframes cr-spin    { to { transform: rotate(360deg) } }
    @keyframes cr-pulse   { 0%,100%{opacity:1} 50%{opacity:0.45} }
    @keyframes cr-toast-in  { from { opacity:0; transform:translateX(110%) } to { opacity:1; transform:translateX(0) } }
    @keyframes cr-toast-out { from { opacity:1; transform:translateX(0)    } to { opacity:0; transform:translateX(110%) } }
    @keyframes cr-shake  {
      0%,100%{transform:translateX(0)}
      20%    {transform:translateX(-5px)}
      40%    {transform:translateX(5px)}
      60%    {transform:translateX(-4px)}
      80%    {transform:translateX(4px)}
    }
    @keyframes cr-scan {
      0%   { top:-2px }
      100% { top:100% }
    }
    .cr-field-wrap input:focus,
    .cr-field-wrap select:focus,
    .cr-field-wrap textarea:focus {
      outline: none;
      border-color: ${T.accentBorder} !important;
      background: ${T.bg3} !important;
      box-shadow: 0 0 0 3px ${T.accentDim};
    }
    .cr-field-wrap input::placeholder,
    .cr-field-wrap textarea::placeholder { color: ${T.txt3}; }
    .cr-field-wrap select option { background: ${T.bg2}; color: ${T.txt}; }
    .cr-submit-btn:hover:not(:disabled) {
      background: #c8303c !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 24px ${T.accentGlow} !important;
    }
    .cr-submit-btn:active:not(:disabled) { transform: translateY(0) scale(0.99); }
    .cr-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .cr-drop-zone:hover { border-color: ${T.accentBorder} !important; background: ${T.accentDim} !important; }
    .cr-reset-btn:hover  { color: ${T.txt} !important; border-color: ${T.border2} !important; background: ${T.bg3} !important; }
  `;
  document.head.appendChild(s);
}

// ── Toast component ───────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "14px 18px",
          background: t.type === "success" ? "rgba(15,23,20,0.97)" : "rgba(20,10,12,0.97)",
          border: `1px solid ${t.type === "success" ? T.greenBorder : T.accentBorder}`,
          borderRadius: 8,
          minWidth: 300, maxWidth: 380,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          backdropFilter: "blur(12px)",
          animation: `cr-toast-in 0.3s ease both`,
          pointerEvents: "auto",
        }}>
          {/* Icon */}
          <div style={{
            width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
            background: t.type === "success" ? T.greenDim : T.accentDim,
            border: `1px solid ${t.type === "success" ? T.greenBorder : T.accentBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {t.type === "success"
              ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke={T.accent} strokeWidth="2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke={T.accent} strokeWidth="2" strokeLinecap="round"/></svg>
            }
          </div>
          {/* Content */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.display, fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 2 }}>
              {t.title}
            </div>
            <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt2, lineHeight: 1.5 }}>
              {t.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "cr-spin 0.75s linear infinite", display: "block" }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.2" strokeWidth="3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function Label({ children, required, htmlFor }) {
  return (
    <label htmlFor={htmlFor} style={{
      display: "block", marginBottom: 7,
      fontFamily: T.mono, fontSize: 10.5, letterSpacing: "0.1em",
      textTransform: "uppercase", color: T.txt2, fontWeight: 500,
    }}>
      {children}
      {required && <span style={{ color: T.accent, marginLeft: 4 }}>*</span>}
    </label>
  );
}

// ── Input base styles ─────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: T.bg2, color: T.txt,
  border: `1px solid ${T.border}`,
  borderRadius: 7, fontSize: 13, fontFamily: T.body,
  transition: "all 0.18s ease",
  WebkitAppearance: "none",
};

// ── Photo upload zone ─────────────────────────────────────────────────────────
function PhotoUpload({ file, preview, onFile, hasError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) onFile(dropped);
  }, [onFile]);

  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleChange    = (e) => { const f = e.target.files?.[0]; if (f) onFile(f); };

  return (
    <div>
      <Label required>Reference Photo</Label>
      <div
        className="cr-drop-zone"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          position: "relative", overflow: "hidden",
          border: `1.5px dashed ${dragging ? T.accentBorder : hasError ? T.accent : T.border2}`,
          borderRadius: 10,
          background: dragging ? T.accentDim : T.bg2,
          cursor: "pointer",
          transition: "all 0.2s ease",
          minHeight: preview ? "auto" : 160,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}
      >
        {/* Scan line on drag */}
        {dragging && (
          <div style={{
            position: "absolute", left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
            animation: "cr-scan 0.8s linear infinite",
            pointerEvents: "none",
          }}/>
        )}

        {preview ? (
          /* ── Preview ── */
          <div style={{ position: "relative", width: "100%" }}>
            <img
              src={preview} alt="Preview"
              style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block", borderRadius: 8 }}
            />
            {/* Overlay */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 8,
              background: "rgba(0,0,0,0)", transition: "background 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.55)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0)"}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 7, opacity: 0,
                color: T.txt, fontFamily: T.mono, fontSize: 10, letterSpacing: "0.1em",
                padding: "6px 12px", background: "rgba(0,0,0,0.7)", borderRadius: 20,
                border: `1px solid ${T.border2}`, transition: "opacity 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                CHANGE PHOTO
              </div>
            </div>
            {/* File name strip */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "8px 12px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              borderRadius: "0 0 8px 8px",
              fontFamily: T.mono, fontSize: 9, color: T.txt2, letterSpacing: "0.05em",
            }}>
              {file?.name} · {file ? (file.size / 1024).toFixed(0) : 0} KB
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: T.bg3, border: `1px solid ${T.border2}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragging ? T.accent : T.txt3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div style={{ fontFamily: T.display, fontSize: 13, fontWeight: 700, color: dragging ? T.accent : T.txt, marginBottom: 5 }}>
              {dragging ? "Release to upload" : "Drag & drop photo here"}
            </div>
            <div style={{ fontFamily: T.body, fontSize: 11.5, color: T.txt3 }}>
              or <span style={{ color: T.accent, textDecoration: "underline" }}>click to browse</span>
            </div>
            <div style={{ marginTop: 10, fontFamily: T.mono, fontSize: 9.5, color: T.txt3, letterSpacing: "0.08em" }}>
              JPG · PNG · WEBP · max 10 MB
            </div>
          </div>
        )}
        <input
          ref={inputRef} type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>
      {hasError && (
        <p style={{ marginTop: 5, fontFamily: T.mono, fontSize: 10, color: T.accent, letterSpacing: "0.05em" }}>
          ↑ Photo is required
        </p>
      )}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate(fields, photo) {
  const errors = {};
  if (!photo)                                errors.photo       = "Photo is required";
  if (!fields.fullName.trim())               errors.fullName    = "Full name is required";
  if (!fields.age || fields.age < 1 || fields.age > 120) errors.age = "Enter a valid age (1–120)";
  if (!fields.gender)                        errors.gender      = "Select a gender";
  if (!fields.lastSeenLocation.trim())       errors.lastSeenLocation = "Location is required";
  if (!fields.dateLastSeen)                  errors.dateLastSeen = "Date is required";
  else if (fields.dateLastSeen > todayLocal()) errors.dateLastSeen = "Date cannot be in the future";
  if (fields.contact.trim() && !/^[+\d][\d\s-]{6,17}$/.test(fields.contact.trim()))
                                             errors.contact     = "Enter a valid phone number";
  return errors;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CaseRegistration() {
  const EMPTY = {
    fullName: "", age: "", gender: "",
    lastSeenLocation: "", dateLastSeen: "", description: "", contact: "",
  };

  const [fields, setFields]       = useState(EMPTY);
  const [photo, setPhoto]         = useState(null);   // File object
  const [preview, setPreview]     = useState(null);   // Object URL
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [toasts, setToasts]       = useState([]);
  const [submitShake, setShake]   = useState(false);
  const [caseId, setCaseId]       = useState(null);

  // Cleanup object URL on unmount / change
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((type, title, message, duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  // ── Photo handler ──────────────────────────────────────────────────────────
  const handlePhoto = useCallback((file) => {
    if (file.size > 10 * 1024 * 1024) {
      addToast("error", "File Too Large", "Maximum photo size is 10 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, photo: undefined }));
  }, [preview, addToast]);

  // ── Field change ───────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(fields, photo);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      addToast("error", "Validation Failed", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setErrors({});

    const data = {
      name:             fields.fullName.trim(),
      age:              fields.age,
      gender:           fields.gender,
      lastSeenLocation: fields.lastSeenLocation.trim(),
      dateLastSeen:     fields.dateLastSeen,
      description:      fields.description.trim(),
      contact:          fields.contact.trim(),
    };

    try {
      const res = await api.registerCase(data, photo);
      const newCaseId = res.case_id || res.caseId;
      if (!newCaseId) throw new Error("Server did not return a case ID");
      setCaseId(newCaseId);

      addToast(
        "success",
        "Case Registered",
        `Case #${newCaseId.slice(0, 8)} created. Link sightings to it from the Sighting Feed.`,
        7000
      );

      // Reset form
      if (preview) URL.revokeObjectURL(preview);
      setFields(EMPTY);
      setPhoto(null);
      setPreview(null);

    } catch (err) {
      addToast("error", "Registration Failed", err.message || "Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFields(EMPTY);
    setPhoto(null);
    setPreview(null);
    setErrors({});
    setCaseId(null);
  };

  // ── Error helper ───────────────────────────────────────────────────────────
  const ErrMsg = ({ field }) =>
    errors[field] ? (
      <p style={{ marginTop: 5, fontFamily: T.mono, fontSize: 10, color: T.accent, letterSpacing: "0.04em" }}>
        ↑ {errors[field]}
      </p>
    ) : null;

  const fieldStyle = (field) => ({
    ...inputStyle,
    borderColor: errors[field] ? T.accent : T.border,
    boxShadow: errors[field] ? `0 0 0 2px ${T.accentDim}` : "none",
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Toast toasts={toasts} />

      <div style={{
        minHeight: "100%", padding: "0 0 48px",
        fontFamily: T.body,
        animation: "cr-fadein 0.4s ease both",
      }}>

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 9.5, letterSpacing: "0.18em",
            color: T.accent, textTransform: "uppercase", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: T.accent,
              boxShadow: `0 0 8px ${T.accentGlow}`,
              display: "inline-block",
              animation: "cr-pulse 2s ease-in-out infinite",
            }}/>
            New Entry
          </div>
          <h1 style={{
            fontFamily: T.display, fontSize: 28, fontWeight: 800,
            color: T.txt, letterSpacing: "-0.02em", lineHeight: 1.15,
            marginBottom: 6,
          }}>
            Case Registration
          </h1>
          <p style={{ fontSize: 13, color: T.txt2, lineHeight: 1.6, maxWidth: 480 }}>
            Register a new missing person. All fields marked with{" "}
            <span style={{ color: T.accent }}>*</span> are required.
            The reference photo will be processed by the AI matching engine.
          </p>

          {/* Case ID badge after success */}
          {caseId && (
            <div style={{
              marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 14px",
              background: T.greenDim, border: `1px solid ${T.greenBorder}`,
              borderRadius: 20,
            }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <polyline points="1.5,6 5,9.5 10.5,2.5" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.green, letterSpacing: "0.08em" }}>
                LAST REGISTERED: {caseId}
              </span>
              <Link to="/sightings" style={{ fontFamily: T.mono, fontSize: 10, color: T.txt2, marginLeft: 6 }}>
                ADD SIGHTING →
              </Link>
            </div>
          )}
        </div>

        {/* ── Form ──────────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            animation: submitShake ? "cr-shake 0.4s ease" : "none",
          }}
        >
          {/* Two-column grid: photo left, fields right */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 28,
            alignItems: "start",
          }}
            className="cr-form-grid"
          >
            {/* ── LEFT: Photo upload ───────────────────────────────────── */}
            <div className="cr-field-wrap" style={{ animation: "cr-slideup 0.35s 0.05s ease both", opacity: 0, animationFillMode: "forwards" }}>
              <div style={{
                background: T.bg1, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: 20,
              }}>
                <PhotoUpload
                  file={photo}
                  preview={preview}
                  onFile={handlePhoto}
                  hasError={!!errors.photo}
                />

                {/* Photo tips */}
                <div style={{
                  marginTop: 14, padding: "10px 12px",
                  background: T.bg2, borderRadius: 7, border: `1px solid ${T.border}`,
                }}>
                  <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: "0.1em", color: T.txt3, marginBottom: 6, textTransform: "uppercase" }}>
                    Photo Guidelines
                  </div>
                  {["Clear frontal face view", "Good lighting, no heavy blur", "Recent photo preferred", "Minimum 200×200 pixels"].map((tip) => (
                    <div key={tip} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <div style={{ width: 3, height: 3, borderRadius: "50%", background: T.txt3, flexShrink: 0 }}/>
                      <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, lineHeight: 1.4 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Form fields ───────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Panel wrapper */}
              <div style={{
                background: T.bg1, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "22px 24px",
                animation: "cr-slideup 0.35s 0.1s ease both", opacity: 0, animationFillMode: "forwards",
              }}>
                {/* Section label */}
                <div style={{
                  fontFamily: T.mono, fontSize: 9, letterSpacing: "0.16em",
                  color: T.txt3, textTransform: "uppercase", marginBottom: 18,
                  paddingBottom: 12, borderBottom: `1px solid ${T.border}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.txt3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Personal Information
                </div>

                {/* Full name */}
                <div className="cr-field-wrap" style={{ marginBottom: 16 }}>
                  <Label required htmlFor="fullName">Full Name</Label>
                  <input
                    id="fullName" name="fullName" type="text"
                    value={fields.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    style={fieldStyle("fullName")}
                    autoComplete="off"
                  />
                  <ErrMsg field="fullName" />
                </div>

                {/* Age + Gender row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div className="cr-field-wrap">
                    <Label required htmlFor="age">Age</Label>
                    <input
                      id="age" name="age" type="number"
                      value={fields.age} onChange={handleChange}
                      placeholder="e.g. 24" min="1" max="120"
                      style={fieldStyle("age")}
                    />
                    <ErrMsg field="age" />
                  </div>
                  <div className="cr-field-wrap">
                    <Label required htmlFor="gender">Gender</Label>
                    <select
                      id="gender" name="gender"
                      value={fields.gender} onChange={handleChange}
                      style={{
                        ...fieldStyle("gender"),
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2350506a' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                        paddingRight: 36,
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Select…</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="unknown">Unknown</option>
                    </select>
                    <ErrMsg field="gender" />
                  </div>
                </div>
              </div>

              {/* Incident details panel */}
              <div style={{
                background: T.bg1, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "22px 24px",
                animation: "cr-slideup 0.35s 0.15s ease both", opacity: 0, animationFillMode: "forwards",
              }}>
                <div style={{
                  fontFamily: T.mono, fontSize: 9, letterSpacing: "0.16em",
                  color: T.txt3, textTransform: "uppercase", marginBottom: 18,
                  paddingBottom: 12, borderBottom: `1px solid ${T.border}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.txt3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Incident Details
                </div>

                {/* Last Seen Location */}
                <div className="cr-field-wrap" style={{ marginBottom: 16 }}>
                  <Label required htmlFor="lastSeenLocation">Last Seen Location</Label>
                  <input
                    id="lastSeenLocation" name="lastSeenLocation" type="text"
                    value={fields.lastSeenLocation} onChange={handleChange}
                    placeholder="e.g. Connaught Place, New Delhi"
                    style={fieldStyle("lastSeenLocation")}
                    autoComplete="off"
                  />
                  <ErrMsg field="lastSeenLocation" />
                </div>

                {/* Date Last Seen */}
                <div className="cr-field-wrap" style={{ marginBottom: 16 }}>
                  <Label required htmlFor="dateLastSeen">Date Last Seen</Label>
                  <input
                    id="dateLastSeen" name="dateLastSeen" type="date"
                    value={fields.dateLastSeen} onChange={handleChange}
                    max={todayLocal()}
                    style={{
                      ...fieldStyle("dateLastSeen"),
                      colorScheme: "dark",
                    }}
                  />
                  <ErrMsg field="dateLastSeen" />
                </div>

                {/* Contact */}
                <div className="cr-field-wrap" style={{ marginBottom: 16 }}>
                  <Label htmlFor="contact">
                    Family Contact{" "}
                    <span style={{ color: T.txt3, fontWeight: 400, textTransform: "none", fontSize: 9 }}>(optional)</span>
                  </Label>
                  <input
                    id="contact" name="contact" type="tel"
                    value={fields.contact} onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    style={fieldStyle("contact")}
                    autoComplete="off"
                  />
                  <ErrMsg field="contact" />
                </div>

                {/* Description */}
                <div className="cr-field-wrap">
                  <Label htmlFor="description">
                    Description{" "}
                    <span style={{ color: T.txt3, fontWeight: 400, textTransform: "none", fontSize: 9 }}>(optional)</span>
                  </Label>
                  <textarea
                    id="description" name="description"
                    value={fields.description} onChange={handleChange}
                    rows={4}
                    placeholder="Height, build, clothing last worn, distinguishing marks, circumstances of disappearance…"
                    style={{
                      ...inputStyle,
                      resize: "vertical", minHeight: 96, maxHeight: 220,
                      lineHeight: 1.6,
                      borderColor: T.border,
                    }}
                  />
                  <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 9.5, color: T.txt3, textAlign: "right" }}>
                    {fields.description.length} chars
                  </div>
                </div>
              </div>

              {/* ── Actions ─────────────────────────────────────────────── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end",
                animation: "cr-slideup 0.35s 0.2s ease both", opacity: 0, animationFillMode: "forwards",
              }}>
                {/* Reset */}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="cr-reset-btn"
                  style={{
                    padding: "11px 20px", borderRadius: 7, cursor: "pointer",
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    color: T.txt2, fontFamily: T.body, fontSize: 13, fontWeight: 500,
                    transition: "all 0.18s",
                  }}
                >
                  Reset Form
                </button>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="cr-submit-btn"
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 28px", borderRadius: 7, cursor: "pointer",
                    background: T.accent,
                    border: "none",
                    color: "#fff", fontFamily: T.display, fontSize: 14, fontWeight: 700,
                    letterSpacing: "0.02em",
                    transition: "all 0.18s ease",
                    boxShadow: `0 4px 16px ${T.accentGlow}`,
                    minWidth: 180,
                    justifyContent: "center",
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner size={16} color="#fff" />
                      <span>Registering…</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                      Register Case
                    </>
                  )}
                </button>
              </div>

              {/* Disclaimer */}
              <div style={{
                padding: "10px 14px",
                background: T.accentDim, border: `1px solid ${T.accentBorder}`,
                borderRadius: 7,
                display: "flex", alignItems: "flex-start", gap: 10,
                animation: "cr-slideup 0.35s 0.22s ease both", opacity: 0, animationFillMode: "forwards",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span style={{ fontFamily: T.body, fontSize: 11.5, color: T.txt2, lineHeight: 1.55 }}>
                  Submitted data is stored securely and accessed only by authorised law enforcement personnel. 
                  The uploaded photo is processed by the AI face-matching engine for identification purposes only.
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Responsive: single-column on narrow screens */}
      <style>{`
        @media (max-width: 720px) {
          .cr-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
