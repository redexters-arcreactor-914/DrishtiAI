"""
seed_data.py — populates DrishtiAI with realistic synthetic data for demo.
Run: python seed_data.py            (from any directory)
     python seed_data.py --force    (wipe existing data first)
"""
import os, sys, sqlite3, uuid, json, random
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DRISHTI_DB", BASE_DIR / "drishti.db"))

CASES = [
    {"name": "Ravi Kumar Sharma", "age": 34, "gender": "Male",
     "description": "Medium build, 5'8\", scar on left cheek, last seen wearing grey kurta",
     "contact": "9876543210", "last_seen_location": "Varanasi Junction, Platform 3",
     "date_last_seen": "2025-04-01"},
    {"name": "Priya Devi Gupta", "age": 17, "gender": "Female",
     "description": "Slim, 5'3\", long black hair, was wearing school uniform (blue)",
     "contact": "9823456780", "last_seen_location": "Godowlia Chowk, Varanasi",
     "date_last_seen": "2025-04-02"},
    {"name": "Mohammed Arshad Khan", "age": 55, "gender": "Male",
     "description": "Heavy build, beard, glasses, retired government employee",
     "contact": "9012345678", "last_seen_location": "Sarnath Bus Stand",
     "date_last_seen": "2025-03-29"},
    {"name": "Sunita Yadav", "age": 28, "gender": "Female",
     "description": "Medium height, mole above left lip, works as nurse, wearing green saree",
     "contact": "8765432109", "last_seen_location": "BHU Campus Gate 1",
     "date_last_seen": "2025-04-03"},
]

SIGHTINGS = [
    # Ravi Kumar sightings (index 0)
    {"raw_text": "I saw a man matching the description near Assi Ghat around 3pm today, he was asking for directions to Allahabad",
     "location": "Assi Ghat, Varanasi", "latitude": 25.2867, "longitude": 83.0068,
     "sighted_at": "2025-04-02T15:00:00", "confidence": 0.72},
    {"raw_text": "A man in grey kurta was spotted at Prayagraj railway station tea stall, seemed confused and disoriented",
     "location": "Prayagraj Junction", "latitude": 25.4484, "longitude": 81.8322,
     "sighted_at": "2025-04-03T09:30:00", "confidence": 0.65},
    {"raw_text": "Near Benares Hindu University main gate, someone saw a man with scar on cheek asking for food near the canteen",
     "location": "BHU Main Gate, Varanasi", "latitude": 25.2677, "longitude": 82.9913,
     "sighted_at": "2025-04-03T14:00:00", "confidence": 0.58},

    # Priya Devi sightings (index 1)
    {"raw_text": "A girl in school uniform was seen boarding a bus at Lahartara chowk yesterday evening around 6pm",
     "location": "Lahartara, Varanasi", "latitude": 25.3479, "longitude": 82.9740,
     "sighted_at": "2025-04-02T18:00:00", "confidence": 0.81},
    {"raw_text": "Someone spotted a young girl matching description at Mughal Sarai station, she was alone and looked scared",
     "location": "Pt. Deen Dayal Upadhyaya Junction", "latitude": 25.2132, "longitude": 83.1195,
     "sighted_at": "2025-04-03T07:15:00", "confidence": 0.77},

    # Mohammed Arshad sightings (index 2)
    {"raw_text": "An elderly man with glasses and beard was seen near Sarnath deer park, sat near the stupa for long time",
     "location": "Sarnath, Varanasi", "latitude": 25.3748, "longitude": 83.0239,
     "sighted_at": "2025-03-30T11:00:00", "confidence": 0.69},
    {"raw_text": "Man fitting description seen at Ramnagar Fort market, buying chai and sitting alone, appeared tired",
     "location": "Ramnagar, Varanasi", "latitude": 25.2585, "longitude": 83.0274,
     "sighted_at": "2025-03-31T16:30:00", "confidence": 0.63},

    # Sunita Yadav sightings (index 3)
    {"raw_text": "A woman in green saree spotted near Cantonment station waiting area, early morning around 5am today",
     "location": "Varanasi Cantonment Station", "latitude": 25.3293, "longitude": 82.9845,
     "sighted_at": "2025-04-04T05:00:00", "confidence": 0.88},
    {"raw_text": "Nurse-looking woman seen at Banaras Hindu University hospital gate asking about bus to Lucknow",
     "location": "BHU Hospital, Varanasi", "latitude": 25.2525, "longitude": 82.9985,
     "sighted_at": "2025-04-04T11:45:00", "confidence": 0.74},
]

# Map sighting index → case index
SIGHTING_CASE_MAP = [0, 0, 0, 1, 1, 2, 2, 3, 3]

MATCHES = [
    {"sighting_idx": 0, "case_idx": 0, "score": 82.4},
    {"sighting_idx": 1, "case_idx": 0, "score": 67.1},
    {"sighting_idx": 3, "case_idx": 1, "score": 78.9},
    {"sighting_idx": 4, "case_idx": 1, "score": 71.3},
    {"sighting_idx": 7, "case_idx": 3, "score": 91.2},
    {"sighting_idx": 5, "case_idx": 2, "score": 64.7},
]

def new_id(): return str(uuid.uuid4())
def ts(offset_hours=0):
    return (datetime.now(timezone.utc) - timedelta(hours=offset_hours)).strftime("%Y-%m-%dT%H:%M:%SZ")

def _init_schema():
    """Create/migrate tables using the same schema as app.py."""
    sys.path.insert(0, str(BASE_DIR))
    from app import init_db
    init_db(DB_PATH)

def seed(force=False):
    _init_schema()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    existing = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
    if existing > 0 and not force:
        print(f"DB already has {existing} case(s). Run with --force to wipe and re-seed.")
        conn.close()
        return
    if force:
        for t in ("matches", "sightings", "cases", "audit_log"):
            conn.execute(f"DELETE FROM {t}")

    print("Seeding cases...")
    case_ids = []
    for i, c in enumerate(CASES):
        cid = new_id()
        case_ids.append(cid)
        conn.execute(
            """INSERT INTO cases (id,name,age,gender,description,contact,
               last_seen_location,date_last_seen,photo_path,status,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (cid, c["name"], c["age"], c["gender"], c["description"],
             c["contact"], c["last_seen_location"], c["date_last_seen"],
             None, "open", ts(offset_hours=random.randint(24, 120)))
        )
        conn.execute(
            "INSERT INTO audit_log (id,action,details,created_at) VALUES (?,?,?,?)",
            (new_id(), "CASE_REGISTERED", f"name={c['name']} id={cid}", ts())
        )
        print(f"  Case: {c['name']} → {cid[:8]}…")

    print("Seeding sightings...")
    sighting_ids = []
    for i, s in enumerate(SIGHTINGS):
        sid = new_id()
        sighting_ids.append(sid)
        case_idx = SIGHTING_CASE_MAP[i]
        cid = case_ids[case_idx]
        nlp = {
            "location": s["location"],
            "latitude": s["latitude"],
            "longitude": s["longitude"],
            "sighted_at": s["sighted_at"],
            "confidence": s["confidence"],
        }
        conn.execute(
            """INSERT INTO sightings (id,case_id,raw_text,location,latitude,longitude,
               sighted_at,confidence,photo_path,nlp_data,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (sid, cid, s["raw_text"], s["location"], s["latitude"], s["longitude"],
             s["sighted_at"], s["confidence"], None, json.dumps(nlp),
             ts(offset_hours=random.randint(1, 72)))
        )
        conn.execute(
            "INSERT INTO audit_log (id,action,details,created_at) VALUES (?,?,?,?)",
            (new_id(), "SIGHTING_ADDED", f"id={sid} case={cid}", ts())
        )
        print(f"  Sighting at {s['location']}")

    print("Seeding matches...")
    for m in MATCHES:
        cid = case_ids[m["case_idx"]]
        sid = sighting_ids[m["sighting_idx"]]
        mid = new_id()
        match_data = {
            "score": m["score"],
            "confidence": m["score"],
            "engines_used": ["demo-seed"],
            "sighting_id": sid,
            "seeded": True,
        }
        conn.execute(
            """INSERT INTO matches (id,case_id,sighting_id,score,match_data,created_at,status)
               VALUES (?,?,?,?,?,?,'pending')""",
            (mid, cid, sid, m["score"], json.dumps(match_data), ts())
        )
        conn.execute(
            "INSERT INTO audit_log (id,action,details,created_at) VALUES (?,?,?,?)",
            (new_id(), "MATCH_RUN", f"case={cid} score={m['score']}", ts())
        )
        print(f"  Match: score={m['score']} case→{CASES[m['case_idx']]['name'][:12]}")

    conn.commit()
    conn.close()
    print("\nDone! Seeded:")
    print(f"  {len(CASES)} cases")
    print(f"  {len(SIGHTINGS)} sightings (all with lat/lng for map)")
    print(f"  {len(MATCHES)} face match results")
    print(f"  Audit log entries for all actions")
    print("\nAll sightings are in Varanasi / UP region — perfect for your IIT BHU demo.")

if __name__ == "__main__":
    seed(force="--force" in sys.argv)