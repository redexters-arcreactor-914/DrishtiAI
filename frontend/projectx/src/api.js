


















































































/**
 * api.js — ProjectX API client
 * Drop this in src/ and import it in any React component.
 *
 * Usage examples:
 *   import api from './api';
 *   const { cases } = await api.getCases();
 *   const { sighting_id, nlp } = await api.addSighting(text, caseId);
 *   const { matches } = await api.runMatch(caseId, photoFile);
 *   const mapHtml = await api.getMapHtml();
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function request(method, path, body, isForm = false) {
  const opts = {
    method,
    headers: isForm ? {} : { "Content-Type": "application/json" },
    body: body
      ? isForm
        ? body                           // FormData
        : JSON.stringify(body)
      : undefined,
  };

  const res = await fetch(`${BASE}${path}`, opts);
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const detail = contentType.includes("json")
      ? (await res.json()).error
      : await res.text();
    throw new Error(detail ?? `HTTP ${res.status}`);
  }

  // Map endpoint returns raw HTML
  if (contentType.includes("text/html")) return res.text();
  return res.json();
}

// ── Endpoints ─────────────────────────────────────────────────

/**
 * Register a new missing-person case.
 * @param {Object} data  — { name, age?, gender?, description?, contact? }
 * @param {File}   photo — optional File object
 */
async function registerCase(data, photo = null) {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => v != null && form.append(k, v));
  if (photo) form.append("photo", photo);
  return request("POST", "/api/register", form, true);
}

/**
 * Submit a sighting report; triggers NLP extraction.
 * @param {string} rawText
 * @param {string} caseId  — optional
 */
async function addSighting(rawText, caseId = null) {
  return request("POST", "/api/sighting", { raw_text: rawText, case_id: caseId });
}

/**
 * Run face matching for a case.
 * @param {string} caseId
 * @param {File}   photo  — optional override photo
 */
async function runMatch(caseId, photo = null) {
  if (photo) {
    const form = new FormData();
    form.append("case_id", caseId);
    form.append("photo", photo);
    return request("POST", "/api/match", form, true);
  }
  return request("POST", "/api/match", { case_id: caseId });
}

/**
 * Fetch all cases.
 * @param {Object} params — { status?, q? }
 */
async function getCases({ status = "all", q = "" } = {}) {
  const qs = new URLSearchParams({ status, q }).toString();
  return request("GET", `/api/cases?${qs}`);
}

/**
 * Fetch sightings.
 * @param {Object} params — { case_id?, limit? }
 */
async function getSightings({ case_id = null, limit = 50 } = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ case_id, limit }).filter(([, v]) => v != null)
    )
  ).toString();
  return request("GET", `/api/sightings?${qs}`);
}

/**
 * Fetch Folium map as an HTML string.
 * Inject it via dangerouslySetInnerHTML or into an <iframe>.
 * @param {string} caseId — optional
 */
async function getMapHtml(caseId = null) {
  const qs = caseId ? `?case_id=${caseId}` : "";
  return request("GET", `/api/map${qs}`);
}

/** Health check */
async function health() {
  return request("GET", "/api/health");
}

const api = { registerCase, addSighting, runMatch, getCases, getSightings, getMapHtml, health };
export default api;
