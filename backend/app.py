"""
DrishtiAI Backend — Flask API
Connects: Face Matching Module + NLP Sighting Extractor + React Dashboard
Storage  : SQLite (drishti.db, auto-created on first import)
Run      : python app.py   (from any directory)
"""

import os
import sys
import uuid
import json
import sqlite3
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("drishti")

sys.path.insert(0, str(BASE_DIR / "nlp_geo"))
sys.path.insert(0, str(BASE_DIR / "face_matching"))

# ── Optional modules — the API must start even if a module fails to import ──
try:
    from extractor import extract_sighting as extract_sighting_info
    NLP_AVAILABLE = True
except Exception as e:  # noqa: BLE001
    log.error(f"NLP extractor unavailable: {e}")
    NLP_AVAILABLE = False

    def extract_sighting_info(text):
        return {"location": None, "latitude": None, "longitude": None,
                "sighted_at": None, "confidence": None, "raw_text": text,
                "warning": "NLP module not available"}

MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.40"))
try:
    import face_matcher as _fm
    _matcher = _fm.FaceMatcher(threshold=MATCH_THRESHOLD, top_k=10)
    FACE_MATCHING_AVAILABLE = True
    FACE_ENGINES = ([e for e, ok in (("deepface", _fm.DEEPFACE_AVAILABLE),
                                     ("insightface", _fm.INSIGHTFACE_AVAILABLE)) if ok]
                    or ["histogram"])
except Exception as e:  # noqa: BLE001
    log.error(f"FaceMatcher unavailable: {e}")
    _matcher, FACE_MATCHING_AVAILABLE, FACE_ENGINES = None, False, []

try:
    from map_builder import generate_map_html
except Exception as e:  # noqa: BLE001
    log.error(f"Map builder unavailable: {e}")

    def generate_map_html(points, case_names=None):
        return "<html><body style='background:#0a0a0f;color:#e63946;font-family:monospace'>" \
               "<p>Map module not available (pip install folium).</p></body></html>"

# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024  # reject giant uploads early
CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "*")}})

DB_PATH = Path(os.getenv("DRISHTI_DB", BASE_DIR / "drishti.db"))
UPLOAD_DIR = Path(os.getenv("DRISHTI_UPLOADS", BASE_DIR / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_PHOTO_BYTES = 10 * 1024 * 1024
CASE_STATUSES = {"open", "found", "closed"}
MATCH_STATUSES = {"pending", "flagged", "dismissed"}


# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    age          INTEGER,
    gender       TEXT,
    description  TEXT,
    contact      TEXT,
    last_seen_location TEXT,
    date_last_seen     TEXT,
    photo_path   TEXT,
    status       TEXT DEFAULT 'open',
    created_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sightings (
    id           TEXT PRIMARY KEY,
    case_id      TEXT,
    raw_text     TEXT NOT NULL,
    location     TEXT,
    latitude     REAL,
    longitude    REAL,
    sighted_at   TEXT,
    confidence   REAL,
    photo_path   TEXT,
    nlp_data     TEXT,
    created_at   TEXT NOT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);
CREATE TABLE IF NOT EXISTS matches (
    id           TEXT PRIMARY KEY,
    case_id      TEXT NOT NULL,
    sighting_id  TEXT,
    score        REAL,
    match_data   TEXT,
    created_at   TEXT NOT NULL,
    FOREIGN KEY (case_id)     REFERENCES cases(id),
    FOREIGN KEY (sighting_id) REFERENCES sightings(id)
);
CREATE TABLE IF NOT EXISTS audit_log (
    id         TEXT PRIMARY KEY,
    action     TEXT NOT NULL,
    details    TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sightings_case ON sightings(case_id);
CREATE INDEX IF NOT EXISTS idx_matches_case   ON matches(case_id);
"""


def init_db(path: Path = None):
    """Create tables and migrate older databases in place. Safe to call often."""
    db = sqlite3.connect(path or DB_PATH)
    try:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript(SCHEMA)
        cols = {r[1] for r in db.execute("PRAGMA table_info(matches)")}
        if "status" not in cols:
            db.execute("ALTER TABLE matches ADD COLUMN status TEXT DEFAULT 'pending'")
        if "updated_at" not in cols:
            db.execute("ALTER TABLE matches ADD COLUMN updated_at TEXT")
        # Older versions inserted a new row on every match run → duplicates.
        db.execute("""DELETE FROM matches WHERE rowid NOT IN (
                        SELECT MAX(rowid) FROM matches
                        GROUP BY case_id, COALESCE(sighting_id, id))""")
        db.execute("""CREATE UNIQUE INDEX IF NOT EXISTS uq_match_pair
                      ON matches(case_id, sighting_id)""")
        db.commit()
    finally:
        db.close()


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, timeout=15)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@app.teardown_appcontext
def close_db(exc=None):
    db = g.pop("db", None)
    if db:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def err(msg: str, code: int = 400):
    return jsonify({"error": msg}), code


def arg_int(name: str, default: int, lo: int, hi: int) -> int:
    try:
        return max(lo, min(int(request.args.get(name, default)), hi))
    except (TypeError, ValueError):
        return default


def clean_str(v):
    if v is None:
        return None
    v = str(v).strip()
    return v or None


def photo_url(path):
    return f"/api/photo/{Path(path).name}" if path else None


def save_photo(file_storage) -> str:
    ext = Path(file_storage.filename or "").suffix.lower()
    if ext not in ALLOWED_IMG_EXTS:
        raise ValueError(f"Unsupported image type '{ext or 'unknown'}'. "
                         f"Use one of: {', '.join(sorted(ALLOWED_IMG_EXTS))}")
    data = file_storage.read()
    if not data:
        raise ValueError("Uploaded photo is empty")
    if len(data) > MAX_PHOTO_BYTES:
        raise ValueError("Photo exceeds 10 MB limit")
    try:  # make sure it's actually an image
        import cv2
        import numpy as np
        if cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR) is None:
            raise ValueError("Uploaded file is not a readable image")
    except ImportError:
        pass
    full_path = UPLOAD_DIR / f"{new_id()}{ext}"
    full_path.write_bytes(data)
    return str(full_path)


def resolve_photo(stored):
    """Stored paths may be absolute from another machine; fall back to UPLOAD_DIR."""
    if not stored:
        return None
    p = Path(stored)
    if p.exists():
        return p
    alt = UPLOAD_DIR / p.name
    return alt if alt.exists() else None


def audit(db, action: str, details: str = ""):
    try:
        db.execute("INSERT INTO audit_log (id, action, details, created_at) VALUES (?,?,?,?)",
                   (new_id(), action, details, now_iso()))
    except Exception:  # noqa: BLE001 — never fail a request because of audit
        log.exception("audit failed")


def case_public(row) -> dict:
    d = dict(row)
    d["photo_url"] = photo_url(d.pop("photo_path", None))
    return d


def sighting_public(row) -> dict:
    d = dict(row)
    try:
        d["nlp_data"] = json.loads(d.get("nlp_data") or "{}")
    except json.JSONDecodeError:
        d["nlp_data"] = {}
    d["photo_url"] = photo_url(d.pop("photo_path", None))
    return d


def get_case(db, case_id):
    return db.execute("SELECT * FROM cases WHERE id=?", (case_id,)).fetchone()


# ─────────────────────────────────────────────────────────────────────────────
# Face matching
# ─────────────────────────────────────────────────────────────────────────────

def run_face_match(reference_photo_path, sighting_photos: list) -> list:
    """
    sighting_photos: [{"sighting_id": str, "photo_path": str}, ...]
    Returns results above threshold, highest first, each with sighting_id.
    """
    if not FACE_MATCHING_AVAILABLE or not sighting_photos:
        return []
    by_path = {}
    for item in sighting_photos:
        p = resolve_photo(item["photo_path"])
        if p:
            by_path[str(p)] = item["sighting_id"]
    if not by_path:
        return []

    raw = _matcher.compare_files(str(reference_photo_path), list(by_path))
    out = []
    for r in raw:
        out.append({
            "sighting_id":     by_path.get(r["filepath"]),
            "score":           r["confidence"],          # 0–100
            "confidence":      r["confidence"],
            "confidence_raw":  r["confidence_raw"],
            "engines_used":    r["engines_used"],
            "low_reliability": r.get("low_reliability", False),
            "face_location":   r["face_location"],
        })
    return out


def store_matches(db, case_row, results, ref_path=None) -> int:
    """Upsert match rows (one per case/sighting pair). Keeps review status."""
    ref_name = Path(ref_path or case_row["photo_path"] or "").name or None
    n = 0
    for r in results:
        if not r.get("sighting_id"):
            continue
        srow = db.execute("SELECT photo_path FROM sightings WHERE id=?",
                          (r["sighting_id"],)).fetchone()
        data = dict(r, reference_photo=ref_name,
                    sighting_photo=Path(srow["photo_path"]).name if srow and srow["photo_path"] else None)
        db.execute(
            """INSERT INTO matches (id, case_id, sighting_id, score, match_data, created_at,
                                    status, updated_at)
               VALUES (?,?,?,?,?,?, 'pending', ?)
               ON CONFLICT(case_id, sighting_id) DO UPDATE SET
                   score=excluded.score, match_data=excluded.match_data,
                   updated_at=excluded.updated_at""",
            (new_id(), case_row["id"], r["sighting_id"], r["score"],
             json.dumps(data), now_iso(), now_iso()))
        n += 1
    return n


# ─────────────────────────────────────────────────────────────────────────────
# Cases
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/register")
def register_case():
    form = request.form
    name = clean_str(form.get("name"))
    if not name:
        return err("'name' is required")

    age = clean_str(form.get("age"))
    if age is not None:
        try:
            age = int(age)
            if not 0 <= age <= 130:
                raise ValueError
        except ValueError:
            return err("'age' must be a number between 0 and 130")

    photo_path = None
    f = request.files.get("photo")
    if f and f.filename:
        try:
            photo_path = save_photo(f)
        except ValueError as e:
            return err(str(e))

    case_id = new_id()
    db = get_db()
    db.execute(
        """INSERT INTO cases (id, name, age, gender, description, contact,
                              last_seen_location, date_last_seen, photo_path, status, created_at)
           VALUES (?,?,?,?,?,?,?,?,?, 'open', ?)""",
        (case_id, name, age, clean_str(form.get("gender")), clean_str(form.get("description")),
         clean_str(form.get("contact")),
         clean_str(form.get("lastSeenLocation") or form.get("last_seen_location")),
         clean_str(form.get("dateLastSeen") or form.get("date_last_seen")),
         photo_path, now_iso()))
    audit(db, "CASE_REGISTERED", f"name={name} id={case_id}")
    db.commit()
    log.info(f"Case registered: {name} ({case_id})")
    return jsonify({"success": True, "case_id": case_id, "caseId": case_id,
                    "photo_url": photo_url(photo_path)}), 201


@app.get("/api/cases")
def get_cases():
    status = request.args.get("status", "all")
    q = (request.args.get("q") or "").strip()
    query = """
        SELECT c.*,
               (SELECT COUNT(*) FROM sightings s WHERE s.case_id = c.id) AS sighting_count,
               (SELECT COUNT(*) FROM matches   m WHERE m.case_id = c.id) AS match_count,
               (SELECT MAX(COALESCE(s.sighted_at, s.created_at))
                  FROM sightings s WHERE s.case_id = c.id)              AS last_sighting_at
        FROM cases c
    """
    params, where = [], []
    if status != "all":
        where.append("c.status = ?")
        params.append(status)
    if q:
        where.append("(c.name LIKE ? OR c.description LIKE ? OR c.id LIKE ?)")
        params += [f"%{q}%", f"%{q}%", f"{q}%"]
    if where:
        query += " WHERE " + " AND ".join(where)
    query += " ORDER BY c.created_at DESC"
    rows = [case_public(r) for r in get_db().execute(query, params).fetchall()]
    return jsonify({"cases": rows, "total": len(rows)}), 200


@app.get("/api/cases/<case_id>")
def get_case_detail(case_id):
    db = get_db()
    row = get_case(db, case_id)
    if not row:
        return err("Case not found", 404)
    sightings = [sighting_public(r) for r in db.execute(
        "SELECT * FROM sightings WHERE case_id=? ORDER BY created_at DESC", (case_id,))]
    return jsonify({"case": case_public(row), "sightings": sightings}), 200


@app.patch("/api/cases/<case_id>")
def update_case(case_id):
    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status not in CASE_STATUSES:
        return err(f"'status' must be one of {sorted(CASE_STATUSES)}")
    db = get_db()
    if not get_case(db, case_id):
        return err("Case not found", 404)
    db.execute("UPDATE cases SET status=? WHERE id=?", (status, case_id))
    audit(db, "CASE_STATUS", f"case={case_id} status={status}")
    db.commit()
    return jsonify({"success": True, "case": case_public(get_case(db, case_id))}), 200


# ─────────────────────────────────────────────────────────────────────────────
# Sightings
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/sighting")
def add_sighting():
    """
    Submit a sighting report (multipart/form-data or JSON).
    - NLP extracts location/time (Gemini, or offline fallback)
    - If a photo is attached and a case is linked, the photo is face-matched
      against that case's reference photo.
    """
    photo_path = None
    if request.content_type and "multipart/form-data" in request.content_type:
        raw_text = clean_str(request.form.get("raw_text"))
        case_id = clean_str(request.form.get("case_id"))
        f = request.files.get("photo")
        if f and f.filename:
            try:
                photo_path = save_photo(f)
            except ValueError as e:
                return err(str(e))
    else:
        body = request.get_json(silent=True) or {}
        raw_text = clean_str(body.get("raw_text"))
        case_id = clean_str(body.get("case_id"))

    if not raw_text:
        return err("'raw_text' is required")
    if len(raw_text) > 5000:
        return err("'raw_text' is too long (max 5000 characters)")

    db = get_db()
    case = get_case(db, case_id) if case_id else None
    if case_id and not case:
        return err(f"No case with id '{case_id}'", 404)

    try:
        nlp = extract_sighting_info(raw_text)
    except Exception as exc:  # noqa: BLE001
        log.exception("NLP extraction failed")
        nlp = {"location": None, "latitude": None, "longitude": None,
               "sighted_at": None, "confidence": None, "warning": str(exc)}

    sighting_id = new_id()
    db.execute(
        """INSERT INTO sightings (id, case_id, raw_text, location, latitude, longitude,
                                  sighted_at, confidence, photo_path, nlp_data, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (sighting_id, case_id, raw_text, nlp.get("location"), nlp.get("latitude"),
         nlp.get("longitude"), nlp.get("sighted_at"), nlp.get("confidence"),
         photo_path, json.dumps(nlp), now_iso()))
    audit(db, "SIGHTING_ADDED", f"id={sighting_id} case={case_id}")
    db.commit()

    # Only the NEW photo needs matching — older ones were matched when added.
    match_results, match_note = [], None
    if photo_path and case is not None:
        ref = resolve_photo(case["photo_path"])
        if not FACE_MATCHING_AVAILABLE:
            match_note = "Face matching module not available"
        elif not ref:
            match_note = "Case has no reference photo — face matching skipped"
        else:
            try:
                match_results = run_face_match(
                    ref, [{"sighting_id": sighting_id, "photo_path": photo_path}])
                store_matches(db, case, match_results, ref)
                audit(db, "MATCH_RUN", f"case={case_id} sighting={sighting_id} "
                                       f"results={len(match_results)}")
                db.commit()
            except Exception as exc:  # noqa: BLE001
                log.exception("Auto face matching failed")
                match_note = f"Face matching failed: {exc}"
    elif photo_path and case is None:
        match_note = "Link the sighting to a case to run face matching"

    row = db.execute("SELECT * FROM sightings WHERE id=?", (sighting_id,)).fetchone()
    return jsonify({"success": True, "sighting_id": sighting_id,
                    "sighting": sighting_public(row), "nlp": nlp,
                    "matches": match_results, "match_note": match_note}), 201


@app.get("/api/sightings")
def get_sightings():
    case_id = request.args.get("case_id")
    limit = arg_int("limit", 50, 1, 500)
    query = """SELECT s.*, c.name AS case_name FROM sightings s
               LEFT JOIN cases c ON c.id = s.case_id"""
    params = []
    if case_id:
        query += " WHERE s.case_id = ?"
        params.append(case_id)
    query += " ORDER BY s.created_at DESC LIMIT ?"
    params.append(limit)
    rows = [sighting_public(r) for r in get_db().execute(query, params).fetchall()]
    return jsonify({"sightings": rows, "total": len(rows)}), 200


# ─────────────────────────────────────────────────────────────────────────────
# Matches
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/match")
def run_match():
    """Re-run face matching for a case against all its sighting photos."""
    override_photo = None
    if request.content_type and "json" in request.content_type:
        case_id = clean_str((request.get_json(silent=True) or {}).get("case_id"))
    else:
        case_id = clean_str(request.form.get("case_id"))
        f = request.files.get("photo")
        if f and f.filename:
            try:
                override_photo = save_photo(f)
            except ValueError as e:
                return err(str(e))

    if not case_id:
        return err("'case_id' is required")
    if not FACE_MATCHING_AVAILABLE:
        return err("Face matching module not available", 503)

    db = get_db()
    case = get_case(db, case_id)
    if not case:
        return err("Case not found", 404)

    ref = resolve_photo(override_photo) if override_photo else resolve_photo(case["photo_path"])
    if not ref:
        return err("This case has no reference photo. Register the case with a photo first.")

    rows = db.execute("SELECT id, photo_path FROM sightings "
                      "WHERE case_id=? AND photo_path IS NOT NULL", (case_id,)).fetchall()
    sighting_photos = [{"sighting_id": r["id"], "photo_path": r["photo_path"]}
                       for r in rows if resolve_photo(r["photo_path"])]
    if not sighting_photos:
        return jsonify({"success": True, "case_id": case_id, "matches": [], "scanned": 0,
                        "note": "No sighting photos linked to this case yet"}), 200

    try:
        results = run_face_match(ref, sighting_photos)
    except Exception as exc:  # noqa: BLE001
        log.exception("Face matching failed")
        return err(f"Face matching failed: {exc}", 500)

    store_matches(db, case, results, ref)
    audit(db, "MATCH_RUN", f"case={case_id} scanned={len(sighting_photos)} results={len(results)}")
    db.commit()
    return jsonify({"success": True, "case_id": case_id, "matches": results,
                    "scanned": len(sighting_photos), "engines": FACE_ENGINES}), 200


@app.get("/api/matches")
def get_matches():
    case_id = request.args.get("case_id")
    status = request.args.get("status")
    limit = arg_int("limit", 50, 1, 200)
    query = """
        SELECT m.*, c.name AS case_name, c.photo_path AS case_photo,
               s.location AS sighting_location, s.sighted_at AS sighted_at,
               s.raw_text AS sighting_text, s.photo_path AS sighting_photo_path
        FROM matches m
        LEFT JOIN cases c     ON c.id = m.case_id
        LEFT JOIN sightings s ON s.id = m.sighting_id
    """
    params, where = [], []
    if case_id:
        where.append("m.case_id = ?")
        params.append(case_id)
    if status in MATCH_STATUSES:
        where.append("COALESCE(m.status,'pending') = ?")
        params.append(status)
    if where:
        query += " WHERE " + " AND ".join(where)
    query += " ORDER BY m.score DESC, m.created_at DESC LIMIT ?"
    params.append(limit)

    out = []
    for r in get_db().execute(query, params).fetchall():
        d = dict(r)
        try:
            d["match_data"] = json.loads(d.get("match_data") or "{}")
        except json.JSONDecodeError:
            d["match_data"] = {}
        d["status"] = d.get("status") or "pending"
        d["reference_photo_url"] = photo_url(d.pop("case_photo", None))
        d["sighting_photo_url"] = photo_url(d.pop("sighting_photo_path", None))
        out.append(d)
    return jsonify({"matches": out, "total": len(out)}), 200


@app.patch("/api/matches/<match_id>")
def review_match(match_id):
    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status not in MATCH_STATUSES:
        return err(f"'status' must be one of {sorted(MATCH_STATUSES)}")
    db = get_db()
    cur = db.execute("UPDATE matches SET status=?, updated_at=? WHERE id=?",
                     (status, now_iso(), match_id))
    if cur.rowcount == 0:
        return err("Match not found", 404)
    audit(db, "MATCH_REVIEWED", f"match={match_id} status={status}")
    db.commit()
    return jsonify({"success": True, "id": match_id, "status": status}), 200


# ─────────────────────────────────────────────────────────────────────────────
# Map / audit / photos / health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/map")
def get_map():
    case_id = request.args.get("case_id")
    fmt = request.args.get("fmt", "html")
    db = get_db()
    query = ("SELECT * FROM sightings WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
    params = []
    if case_id:
        query += " AND case_id = ?"
        params.append(case_id)
    points = []
    for r in db.execute(query, params).fetchall():
        d = sighting_public(r)
        points.append({k: d.get(k) for k in ("id", "case_id", "location", "latitude",
                                              "longitude", "sighted_at", "created_at",
                                              "raw_text", "nlp_data")})
    if fmt == "json":
        return jsonify({"points": points, "total": len(points)}), 200

    names = {r["id"]: r["name"] for r in db.execute("SELECT id, name FROM cases")}
    try:
        html = generate_map_html(points, names)
    except Exception as exc:  # noqa: BLE001
        log.exception("Map generation failed")
        return err(f"Map generation failed: {exc}", 500)
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.get("/api/audit")
def get_audit():
    limit = arg_int("limit", 50, 1, 500)
    rows = get_db().execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?",
                            (limit,)).fetchall()
    return jsonify({"log": [dict(r) for r in rows]}), 200


@app.get("/api/photo/<path:filename>")
def serve_photo(filename):
    safe_path = UPLOAD_DIR / Path(filename).name  # strips ../ traversal
    if Path(filename).suffix.lower() not in ALLOWED_IMG_EXTS or not safe_path.is_file():
        return err("Photo not found", 404)
    return send_file(safe_path, max_age=3600)


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "time": now_iso(),
        "nlp": NLP_AVAILABLE,
        "gemini_configured": os.getenv("GEMINI_API_KEY", "").strip()
                             not in ("", "your_gemini_api_key_here"),
        "face_matching": FACE_MATCHING_AVAILABLE,
        "face_engines": FACE_ENGINES,
        "match_threshold": MATCH_THRESHOLD,
    }), 200


@app.errorhandler(413)
def too_large(_e):
    return err("Upload too large (max 10 MB)", 413)


@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith("/api/"):
        return err("Not found", 404)
    return _e


@app.errorhandler(Exception)
def unhandled(e):
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return err(e.description, e.code)
    log.error("Unhandled error:\n" + traceback.format_exc())
    return err(f"Internal server error: {e}", 500)


# Create/migrate the DB on import so `flask run`, gunicorn and tests all work.
init_db()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    gemini = os.getenv("GEMINI_API_KEY", "").strip() not in ("", "your_gemini_api_key_here")
    log.info(f"DrishtiAI backend on http://{host}:{port} | face engines: {FACE_ENGINES} "
             f"| NLP: {'gemini' if gemini else 'offline fallback'}")
    # use_reloader=False: the reloader imports everything twice, which doubles
    # the (slow) DeepFace/TensorFlow start-up and model memory.
    app.run(debug=debug, host=host, port=port, use_reloader=False)
