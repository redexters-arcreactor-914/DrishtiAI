"""
DrishtiAI Backend — Flask API
Connects: Face Matching Module + NLP Sighting Extractor + React Dashboard
Storage  : SQLite (drishti.db, auto-created on first run)
Run      : python app.py  (from the backend/ directory)
"""

import os
import sys
import uuid
import json
import sqlite3
import traceback
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, g
from flask_cors import CORS

# ── Fix import paths so Python finds your actual module folders ───────────────
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR / "nlp_geo"))
sys.path.insert(0, str(BASE_DIR / "face_matching"))

# ── Import your actual modules with their real names ──────────────────────────
try:
    from extractor import extract_sighting as extract_sighting_info
    print("[✓] NLP extractor loaded")
except ImportError as e:
    print(f"[✗] Could not load NLP extractor: {e}")
    def extract_sighting_info(text):
        return {"location": None, "latitude": None, "longitude": None,
                "sighted_at": None, "confidence": None, "raw": text}

try:
    from face_matcher import FaceMatcher
    _matcher = FaceMatcher(threshold=0.20, top_k=5)
    print("[✓] FaceMatcher loaded")
    FACE_MATCHING_AVAILABLE = True
except ImportError as e:
    print(f"[✗] Could not load FaceMatcher: {e}")
    FACE_MATCHING_AVAILABLE = False
    _matcher = None

try:
    from map_builder import generate_map_html
    print("[✓] Map builder loaded")
except ImportError:
    def generate_map_html(points):
        return "<html><body><p>Map module not available.</p></body></html>"

# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Config ────────────────────────────────────────────────────────────────────
DB_PATH    = BASE_DIR / "drishti.db"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# A temp folder face_matcher can use when it needs to compare individual images
SIGHTING_TEMP_DIR = UPLOAD_DIR / "_sighting_temp"
SIGHTING_TEMP_DIR.mkdir(exist_ok=True)

ALLOWED_IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_PHOTO_BYTES  = 10 * 1024 * 1024  # 10 MB

# ─────────────────────────────────────────────────────────────────────────────
# FaceMatcher wrapper — bridges the class API to what app.py needs
# ─────────────────────────────────────────────────────────────────────────────

def run_face_match(reference_photo_path: str, sighting_photo_paths: list[dict]) -> list[dict]:
    """
    Compare a reference photo against a list of sighting photos.

    Parameters
    ----------
    reference_photo_path : str
        Absolute path to the missing person's reference photo.
    sighting_photo_paths : list of dict
        Each dict has {"sighting_id": str, "photo_path": str}

    Returns
    -------
    list of dict — each has {sighting_id, score, confidence, engines_used, ...}
    """
    if not FACE_MATCHING_AVAILABLE:
        return []
    if not sighting_photo_paths:
        return []

    # FaceMatcher.match() needs a folder — copy/symlink sighting images into
    # a clean temp folder named by the reference's case so runs don't collide.
    import shutil
    import tempfile

    with tempfile.TemporaryDirectory(dir=SIGHTING_TEMP_DIR) as tmp_dir:
        tmp_path = Path(tmp_dir)

        # Map filename → sighting_id so we can re-attach after matching
        filename_to_sighting = {}
        for item in sighting_photo_paths:
            src = Path(item["photo_path"])
            if not src.exists():
                continue
            # Use sighting_id as stem so filenames are unique
            dest_name = item["sighting_id"] + src.suffix
            shutil.copy2(src, tmp_path / dest_name)
            filename_to_sighting[dest_name] = item["sighting_id"]

        if not filename_to_sighting:
            return []

        # Run the matcher
        raw_results = _matcher.match(
            reference_image=reference_photo_path,
            sightings_folder=str(tmp_path),
        )

        # Attach sighting_id back to each result and normalise key name
        enriched = []
        for r in raw_results:
            fname = r.get("filename", "")
            sid   = filename_to_sighting.get(fname)
            enriched.append({
                "sighting_id":    sid,
                "score":          r.get("confidence", 0),        # 0-100
                "confidence":     r.get("confidence", 0),
                "confidence_raw": r.get("confidence_raw", 0),
                "engines_used":   r.get("engines_used", []),
                "face_location":  r.get("face_location", {}),
                "filename":       fname,
            })

        return enriched


# ─────────────────────────────────────────────────────────────────────────────
# Database helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
    return g.db

@app.teardown_appcontext
def close_db(exc=None):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript("""
        PRAGMA journal_mode=WAL;

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
    """)
    db.commit()
    db.close()
    print(f"[DB] Initialised at {DB_PATH}")


# ─────────────────────────────────────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def save_photo(file_storage) -> str:
    ext = Path(file_storage.filename).suffix.lower()
    if ext not in ALLOWED_IMG_EXTS:
        raise ValueError(f"Unsupported image type: {ext}")
    data = file_storage.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise ValueError("Photo exceeds 10 MB limit")
    filename  = f"{new_id()}{ext}"
    full_path = UPLOAD_DIR / filename
    full_path.write_bytes(data)
    return str(full_path)

def row_to_dict(row) -> dict:
    return dict(row) if row else {}

def err(msg: str, code: int = 400):
    return jsonify({"error": msg}), code

def audit(db, action: str, details: str = ""):
    try:
        db.execute(
            "INSERT INTO audit_log (id, action, details, created_at) VALUES (?,?,?,?)",
            (new_id(), action, details, now_iso())
        )
    except Exception:
        pass  # never crash the main request for audit failures


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/register
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/register")
def register_case():
    """
    Register a new missing-person case.
    Accepts multipart/form-data with fields:
        name (required), age, gender, description, contact,
        lastSeenLocation, dateLastSeen, photo (file)
    """
    form = request.form
    name = form.get("name", "").strip()
    if not name:
        return err("'name' is required")

    photo_path = None
    if "photo" in request.files:
        f = request.files["photo"]
        if f.filename:
            try:
                photo_path = save_photo(f)
            except ValueError as e:
                return err(str(e))

    case_id = new_id()
    db = get_db()
    db.execute(
        """INSERT INTO cases
           (id, name, age, gender, description, contact,
            last_seen_location, date_last_seen, photo_path, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            case_id,
            name,
            form.get("age"),
            form.get("gender"),
            form.get("description"),
            form.get("contact"),
            form.get("lastSeenLocation"),   # matches what CaseRegistration.jsx sends
            form.get("dateLastSeen"),
            photo_path,
            now_iso(),
        ),
    )
    db.commit()
    audit(db, "CASE_REGISTERED", f"name={name} id={case_id}")
    db.commit()

    print(f"[✓] Case registered: {name} ({case_id})")
    return jsonify({
        "success": True,
        "case_id": case_id,   # snake_case — matches frontend check below
        "caseId":  case_id,   # camelCase — matches CaseRegistration.jsx line 399
    }), 201


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/sighting
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/sighting")
def add_sighting():
    """
    Submit a sighting report.
    - Runs Gemini NLP to extract location/time automatically
    - If a sighting photo is attached AND a case_id is given, runs face matching
    Accepts multipart/form-data OR JSON.
    """
    try:
        is_multipart = request.content_type and "multipart/form-data" in request.content_type

        if is_multipart:
            raw_text = (request.form.get("raw_text") or "").strip()
            case_id  = request.form.get("case_id")
            photo_path = None
            if "photo" in request.files:
                f = request.files["photo"]
                if f.filename:
                    try:
                        photo_path = save_photo(f)
                    except ValueError as e:
                        return err(str(e))
        else:
            body     = request.get_json(silent=True) or {}
            raw_text = (body.get("raw_text") or "").strip()
            case_id  = body.get("case_id")
            photo_path = None

        if not raw_text:
            return err("'raw_text' is required")

        # ── NLP extraction via Gemini ─────────────────────────────────────────
        print(f"[NLP] Extracting from: {raw_text[:80]}...")
        try:
            nlp = extract_sighting_info(raw_text)
            print(f"[NLP] Result: {nlp}")
        except Exception as exc:
            traceback.print_exc()
            # Don't crash — store with null geo data
            nlp = {"location": None, "latitude": None, "longitude": None,
                   "sighted_at": None, "confidence": None, "error": str(exc)}

        sighting_id = new_id()
        db = get_db()

        db.execute(
            """INSERT INTO sightings
               (id, case_id, raw_text, location, latitude, longitude,
                sighted_at, confidence, photo_path, nlp_data, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                sighting_id,
                case_id,
                raw_text,
                nlp.get("location"),
                nlp.get("latitude"),
                nlp.get("longitude"),
                nlp.get("sighted_at"),
                nlp.get("confidence"),
                photo_path,            # stored in its own column now
                json.dumps(nlp),
                now_iso(),
            ),
        )
        db.commit()
        audit(db, "SIGHTING_ADDED", f"id={sighting_id} case={case_id}")
        db.commit()

        # ── AUTO FACE MATCHING ────────────────────────────────────────────────
        # Fires when EITHER:
        #   (a) this sighting has a photo  → match against case's reference
        #   (b) case_id given              → match ALL sighting photos for that case
        match_results = []
        if case_id and FACE_MATCHING_AVAILABLE:
            try:
                case = db.execute(
                    "SELECT * FROM cases WHERE id=?", (case_id,)
                ).fetchone()

                if case and case["photo_path"] and Path(case["photo_path"]).exists():
                    # Gather all sighting photos for this case (including just-added one)
                    rows = db.execute(
                        "SELECT id, photo_path FROM sightings WHERE case_id=? AND photo_path IS NOT NULL",
                        (case_id,)
                    ).fetchall()

                    sighting_photos = [
                        {"sighting_id": r["id"], "photo_path": r["photo_path"]}
                        for r in rows
                        if r["photo_path"] and Path(r["photo_path"]).exists()
                    ]

                    if sighting_photos:
                        print(f"[MATCH] Running face matching: {len(sighting_photos)} sighting(s)...")
                        match_results = run_face_match(case["photo_path"], sighting_photos)
                        match_results.sort(key=lambda x: x.get("score", 0), reverse=True)

                        # Save top-5 matches
                        for r in match_results[:5]:
                            db.execute(
                                """INSERT INTO matches
                                   (id, case_id, sighting_id, score, match_data, created_at)
                                   VALUES (?,?,?,?,?,?)""",
                                (
                                    new_id(), case_id,
                                    r.get("sighting_id"),
                                    r.get("score"),
                                    json.dumps(r),
                                    now_iso(),
                                ),
                            )
                        db.commit()
                        print(f"[MATCH] ✓ {len(match_results)} match(es) saved")
                    else:
                        print("[MATCH] No sighting photos available — skipping face match")
                else:
                    print("[MATCH] Case has no reference photo — skipping face match")

            except Exception as match_err:
                traceback.print_exc()
                print(f"[MATCH] ✗ Auto matching failed: {match_err}")

        return jsonify({
            "success":    True,
            "sighting_id": sighting_id,
            "nlp":        nlp,
            "matches":    match_results,
        }), 201

    except Exception as e:
        traceback.print_exc()
        return err(f"Unexpected error: {e}", 500)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/match  — manually trigger matching for any case
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/match")
def run_match():
    """
    Manually trigger face matching for a case against all its sighting photos.
    Body (JSON or form): { case_id: "..." }
    Optionally attach a photo file to override the stored reference.
    """
    if request.content_type and "json" in request.content_type:
        body    = request.get_json(silent=True) or {}
        case_id = body.get("case_id", "").strip()
        override_photo = None
    else:
        case_id = (request.form.get("case_id") or "").strip()
        override_photo = None
        if "photo" in request.files:
            f = request.files["photo"]
            if f.filename:
                try:
                    override_photo = save_photo(f)
                except ValueError as e:
                    return err(str(e))

    if not case_id:
        return err("'case_id' is required")

    if not FACE_MATCHING_AVAILABLE:
        return err("Face matching module not available", 503)

    db   = get_db()
    case = row_to_dict(db.execute("SELECT * FROM cases WHERE id=?", (case_id,)).fetchone())
    if not case:
        return err("Case not found", 404)

    ref_photo = override_photo or case.get("photo_path")
    if not ref_photo or not Path(ref_photo).exists():
        return err("No valid reference photo for this case")

    # Get all sighting photos for this case
    rows = db.execute(
        "SELECT id, photo_path FROM sightings WHERE case_id=? AND photo_path IS NOT NULL",
        (case_id,)
    ).fetchall()

    sighting_photos = [
        {"sighting_id": r["id"], "photo_path": r["photo_path"]}
        for r in rows
        if r["photo_path"] and Path(r["photo_path"]).exists()
    ]

    if not sighting_photos:
        return jsonify({
            "success": True, "case_id": case_id, "matches": [],
            "note": "No sighting photos to match against"
        }), 200

    try:
        results = run_face_match(ref_photo, sighting_photos)
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
    except Exception as exc:
        traceback.print_exc()
        return err(f"Face matching failed: {exc}", 500)

    # Persist top matches
    for r in results[:10]:
        db.execute(
            """INSERT INTO matches (id, case_id, sighting_id, score, match_data, created_at)
               VALUES (?,?,?,?,?,?)""",
            (new_id(), case_id, r.get("sighting_id"), r.get("score"), json.dumps(r), now_iso()),
        )
    db.commit()
    audit(db, "MATCH_RUN", f"case={case_id} results={len(results)}")
    db.commit()

    return jsonify({"success": True, "case_id": case_id, "matches": results}), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/cases
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/cases")
def get_cases():
    status = request.args.get("status", "all")
    q      = request.args.get("q", "").strip()

    db    = get_db()
    query = """
        SELECT c.*,
               COUNT(DISTINCT s.id) AS sighting_count,
               COUNT(DISTINCT m.id) AS match_count
        FROM   cases c
        LEFT JOIN sightings s ON s.case_id = c.id
        LEFT JOIN matches   m ON m.case_id = c.id
    """
    params, where = [], []

    if status != "all":
        where.append("c.status = ?")
        params.append(status)
    if q:
        where.append("(c.name LIKE ? OR c.description LIKE ?)")
        params += [f"%{q}%", f"%{q}%"]

    if where:
        query += " WHERE " + " AND ".join(where)
    query += " GROUP BY c.id ORDER BY c.created_at DESC"

    rows = [row_to_dict(r) for r in db.execute(query, params).fetchall()]
    for r in rows:
        r.pop("photo_path", None)   # never expose absolute paths

    return jsonify({"cases": rows, "total": len(rows)}), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/sightings
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/sightings")
def get_sightings():
    case_id = request.args.get("case_id")
    limit   = min(int(request.args.get("limit", 50)), 200)

    db     = get_db()
    query  = "SELECT * FROM sightings"
    params = []
    if case_id:
        query += " WHERE case_id = ?"
        params.append(case_id)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    rows = [row_to_dict(r) for r in db.execute(query, params).fetchall()]
    for r in rows:
        r["nlp_data"] = json.loads(r.get("nlp_data") or "{}")
        r.pop("photo_path", None)

    return jsonify({"sightings": rows, "total": len(rows)}), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/matches
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/matches")
def get_matches():
    case_id = request.args.get("case_id")
    limit   = min(int(request.args.get("limit", 20)), 100)

    db     = get_db()
    query  = "SELECT * FROM matches"
    params = []
    if case_id:
        query += " WHERE case_id = ?"
        params.append(case_id)
    query += " ORDER BY score DESC, created_at DESC LIMIT ?"
    params.append(limit)

    rows = [row_to_dict(r) for r in db.execute(query, params).fetchall()]
    for r in rows:
        r["match_data"] = json.loads(r.get("match_data") or "{}")

    return jsonify({"matches": rows, "total": len(rows)}), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/map
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/map")
def get_map():
    case_id = request.args.get("case_id")
    fmt     = request.args.get("fmt", "html")

    db    = get_db()
    query = "SELECT * FROM sightings WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
    params = []
    if case_id:
        query += " AND case_id = ?"
        params.append(case_id)

    rows   = [row_to_dict(r) for r in db.execute(query, params).fetchall()]
    points = [
        {
            "id":         r["id"],
            "case_id":    r["case_id"],
            "location":   r["location"],
            "latitude":   r["latitude"],
            "longitude":  r["longitude"],
            "sighted_at": r["sighted_at"],
            "nlp_data":   json.loads(r["nlp_data"] or "{}"),
        }
        for r in rows
    ]

    if fmt == "json":
        return jsonify({"points": points, "total": len(points)}), 200

    try:
        html = generate_map_html(points)
    except Exception as exc:
        traceback.print_exc()
        return err(f"Map generation failed: {exc}", 500)

    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/audit
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/audit")
def get_audit():
    db   = get_db()
    rows = db.execute(
        "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50"
    ).fetchall()
    return jsonify({"log": [row_to_dict(r) for r in rows]}), 200

# ─────────────────────────────────────────────────────────────────────────────
# GET /api/photo/<filename>  — serve uploaded photos to frontend
# ─────────────────────────────────────────────────────────────────────────────

from flask import send_file

@app.get("/api/photo/<path:filename>")
def serve_photo(filename):
    """Serve an uploaded photo by filename so the React frontend can display it."""
    # Path(filename).name strips any directory traversal like ../../etc/passwd
    safe_path = UPLOAD_DIR / Path(filename).name
    if not safe_path.exists():
        return err("Photo not found", 404)
    return send_file(safe_path)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "time":   now_iso(),
        "face_matching": FACE_MATCHING_AVAILABLE,
    }), 200

# ─────────────────────────────────────────────────────────────────────────────
# GET /api/photo/<filename>  — serve uploaded photos to frontend
# ─────────────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    init_db()
    print("\n🔴 DrishtiAI backend starting on http://127.0.0.1:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
