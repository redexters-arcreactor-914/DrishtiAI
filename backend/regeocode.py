"""
regeocode.py — fill in missing map coordinates for existing sightings.

Sightings saved while geocoding was failing have a location but no
latitude/longitude, so they never show on the Live Map. This retries them.

Run:  python regeocode.py            (from the backend/ folder)
      python regeocode.py --all      (also re-extract sightings with no location)
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "nlp_geo"))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(BASE_DIR / ".env")
import extractor  # noqa: E402

DB_PATH = Path(os.getenv("DRISHTI_DB", BASE_DIR / "drishti.db"))


def main(reextract: bool):
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    rows = db.execute("SELECT * FROM sightings WHERE latitude IS NULL OR longitude IS NULL").fetchall()
    print(f"{len(rows)} sighting(s) without coordinates")
    fixed = 0
    for r in rows:
        nlp = json.loads(r["nlp_data"] or "{}")
        loc = nlp.get("location_detail")
        if not loc and r["location"]:
            loc = {"landmark": r["location"]}
        if (not loc or not any(loc.values())) and reextract:
            nlp = extractor.extract_sighting(r["raw_text"])
            loc = nlp.get("location_detail")
        if not loc or not any(v for k, v in loc.items() if k != "country"):
            print(f"  - {r['id'][:8]}: no location in report text, skipped")
            continue
        lat, lng = extractor._geocode(loc)
        if lat is None:
            print(f"  ✗ {r['id'][:8]}: could not geocode {loc}")
            continue
        nlp.update(latitude=lat, longitude=lng)
        db.execute(
            "UPDATE sightings SET latitude=?, longitude=?, location=COALESCE(location, ?), nlp_data=? WHERE id=?",
            (lat, lng, nlp.get("location"), json.dumps(nlp), r["id"]))
        fixed += 1
        print(f"  ✓ {r['id'][:8]}: {nlp.get('location') or r['location']} → {lat}, {lng}")
    db.commit()
    db.close()
    print(f"Done — {fixed} sighting(s) now on the map.")


if __name__ == "__main__":
    main(reextract="--all" in sys.argv)
