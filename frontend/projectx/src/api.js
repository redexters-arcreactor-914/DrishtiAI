/**
 * api.js — single API client for the whole dashboard.
 *
 * Backend URL comes from REACT_APP_API_URL (CRA env var, e.g. in
 * frontend/projectx/.env) and defaults to http://127.0.0.1:5000.
 * (The old version used `import.meta.env`, which is Vite-only and crashes
 * under Create React App.)
 */

export const API_BASE = (process.env.REACT_APP_API_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

/** Turn a backend-relative URL like "/api/photo/x.jpg" into an absolute one. */
export const assetUrl = (path) =>
  !path ? null : /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;

async function request(method, path, body, { isForm = false, timeoutMs = 120000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const opts = {
    method,
    signal: controller.signal,
    headers: body && !isForm ? { "Content-Type": "application/json" } : {},
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out — the server took too long to respond.");
    throw new Error(`Cannot reach the backend at ${API_BASE}. Is \`python app.py\` running?`);
  } finally {
    clearTimeout(timer);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      detail = contentType.includes("json") ? (await res.json()).error || detail : (await res.text()) || detail;
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  if (contentType.includes("text/html")) return res.text();
  return res.json();
}

const qs = (params) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
};

/** @param {Object} data form fields  @param {File|null} photo */
function registerCase(data, photo = null) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => v !== null && v !== undefined && v !== "" && form.append(k, v));
  if (photo) form.append("photo", photo);
  return request("POST", "/api/register", form, { isForm: true });
}

function addSighting(rawText, caseId = null, photo = null) {
  if (photo) {
    const form = new FormData();
    form.append("raw_text", rawText);
    if (caseId) form.append("case_id", caseId);
    form.append("photo", photo);
    return request("POST", "/api/sighting", form, { isForm: true, timeoutMs: 300000 });
  }
  return request("POST", "/api/sighting", { raw_text: rawText, case_id: caseId || null });
}

function runMatch(caseId, photo = null) {
  if (photo) {
    const form = new FormData();
    form.append("case_id", caseId);
    form.append("photo", photo);
    return request("POST", "/api/match", form, { isForm: true, timeoutMs: 600000 });
  }
  return request("POST", "/api/match", { case_id: caseId }, { timeoutMs: 600000 });
}

const getCases = ({ status = "all", q = "" } = {}) => request("GET", `/api/cases${qs({ status, q })}`);
const getCase = (id) => request("GET", `/api/cases/${encodeURIComponent(id)}`);
const updateCaseStatus = (id, status) => request("PATCH", `/api/cases/${encodeURIComponent(id)}`, { status });
const getSightings = ({ case_id = null, limit = 50 } = {}) => request("GET", `/api/sightings${qs({ case_id, limit })}`);
const getMatches = ({ case_id = null, status = null, limit = 50 } = {}) =>
  request("GET", `/api/matches${qs({ case_id, status, limit })}`);
const reviewMatch = (id, status) => request("PATCH", `/api/matches/${encodeURIComponent(id)}`, { status });
const getAudit = (limit = 50) => request("GET", `/api/audit${qs({ limit })}`);
const mapUrl = (caseId = null) => `${API_BASE}/api/map${qs({ case_id: caseId })}`;
const health = () => request("GET", "/api/health", null, { timeoutMs: 5000 });

const api = {
  registerCase, addSighting, runMatch, getCases, getCase, updateCaseStatus,
  getSightings, getMatches, reviewMatch, getAudit, mapUrl, health,
};
export default api;
