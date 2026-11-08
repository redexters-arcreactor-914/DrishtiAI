"""
extractor.py
============
NLP Sighting Extractor — DrishtiAI

Turns a free-text sighting report into structured data. Gemini is used when a
GEMINI_API_KEY is configured; otherwise (or if Gemini fails) a rule-based
offline extractor is used so the app keeps working without network/API keys.

Output schema (flat — matches app.py DB insert):
  location     : str   — human readable "Landmark, City, State, Country"
  latitude     : float — geocoded (None if not resolvable)
  longitude    : float — geocoded (None if not resolvable)
  sighted_at   : str   — ISO datetime string or None
  confidence   : float — 0.0 to 1.0
  description  : str   — extracted physical description
  engine       : str   — "gemini" or "offline"
  raw_text     : str   — original input
  extracted_at : str   — ISO timestamp of extraction
  warning      : str   — present only if Gemini failed and we fell back
"""

import os
import json
import re
import time
import logging
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

# Load backend/.env regardless of the current working directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()

log = logging.getLogger("extractor")

# ── Gemini config ────────────────────────────────────────────────────────────
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)
_GEMINI_TIMEOUT = float(os.getenv("GEMINI_TIMEOUT", "20"))

# Light client-side throttle (seconds between calls). The old value of 20s
# blocked every HTTP request for 20s; a short gap is enough for the free tier
# when combined with a single retry on 429.
_MIN_INTERVAL = float(os.getenv("GEMINI_MIN_INTERVAL", "1.0"))
_last_call = 0.0
_rate_lock = threading.Lock()

# ── Geocoder (optional) ───────────────────────────────────────────────────────
try:
    from geopy.geocoders import Nominatim
    _geocoder = Nominatim(user_agent="drishti_ai_missing_persons", timeout=8)
    GEOPY_AVAILABLE = True
except ImportError:
    _geocoder = None
    GEOPY_AVAILABLE = False
    log.warning("geopy not installed — online geocoding disabled.")

_geo_cache: dict = {}
_geo_lock = threading.Lock()
_last_geo_call = 0.0

# Offline gazetteer: lets common places resolve without network access
# (and makes the demo work even when Nominatim is unreachable).
_GAZETTEER = {
    # Varanasi & around
    "assi ghat": (25.2867, 83.0068), "dashashwamedh ghat": (25.3071, 83.0104),
    "manikarnika ghat": (25.3109, 83.0137), "godowlia": (25.3096, 83.0076),
    "lahartara": (25.3180, 82.9640), "sarnath": (25.3811, 83.0215),
    "ramnagar": (25.2700, 83.0260), "bhu": (25.2677, 82.9913),
    "banaras hindu university": (25.2677, 82.9913),
    "varanasi junction": (25.3270, 82.9870), "varanasi cantt": (25.3270, 82.9870),
    "cantonment": (25.3293, 82.9845), "lanka": (25.2780, 82.9990),
    "mughal sarai": (25.2810, 83.1190), "ddu junction": (25.2810, 83.1190),
    "varanasi": (25.3176, 82.9739), "banaras": (25.3176, 82.9739),
    "benares": (25.3176, 82.9739), "kashi": (25.3176, 82.9739),
    "prayagraj": (25.4358, 81.8463), "allahabad": (25.4358, 81.8463),
    "lucknow": (26.8467, 80.9462), "kanpur": (26.4499, 80.3319),
    "agra": (27.1767, 78.0081), "gorakhpur": (26.7606, 83.3732),
    "patna": (25.5941, 85.1376),
    # Delhi
    "connaught place": (28.6315, 77.2167), "india gate": (28.6129, 77.2295),
    "chandni chowk": (28.6506, 77.2303), "new delhi railway station": (28.6430, 77.2195),
    "new delhi": (28.6139, 77.2090), "delhi": (28.7041, 77.1025),
    # Mumbai
    "dadar station": (19.0186, 72.8426), "dadar": (19.0186, 72.8426),
    "chhatrapati shivaji terminus": (18.9398, 72.8355), "cst": (18.9398, 72.8355),
    "gateway of india": (18.9220, 72.8347), "mumbai": (19.0760, 72.8777),
    # Other metros
    "kolkata": (22.5726, 88.3639), "howrah": (22.5958, 88.2636),
    "chennai": (13.0827, 80.2707), "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946), "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567), "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873), "bhopal": (23.2599, 77.4126),
}

# ── Extraction prompt ─────────────────────────────────────────────────────────
_PROMPT_TEMPLATE = """
You are an information extraction engine for a missing persons tracking system.
Today's date is {today}. Resolve relative dates ("yesterday", "last Monday",
"this morning") against today's date.

Extract information from the sighting report below and return ONLY a JSON object.

Sighting report:
\"\"\"{text}\"\"\"

Return this exact JSON shape (use null for missing fields):
{{
  "location": {{
    "landmark": "<specific place/street or null>",
    "city":     "<city name or null>",
    "state":    "<state or null>",
    "country":  "<country, default India if unclear>"
  }},
  "date": "<YYYY-MM-DD or null>",
  "time": "<HH:MM in 24h format or null>",
  "description": "<physical details: age, gender, clothing, features>",
  "confidence": <integer 0-100>
}}

Confidence guide:
  85-100 = exact location + clear date + good description
  65-84  = location + date present, partial description
  40-64  = location OR date missing, vague description
  10-39  = very little useful information
"""


# ─────────────────────────────────────────────────────────────────────────────
# Gemini
# ─────────────────────────────────────────────────────────────────────────────

def _throttle():
    global _last_call
    with _rate_lock:
        wait = _MIN_INTERVAL - (time.time() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.time()


def _parse_json_loose(raw: str) -> dict:
    """Parse model output, tolerating markdown fences or surrounding text."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.S)
        if m:
            return json.loads(m.group(0))
        raise


def _call_gemini(text: str) -> dict:
    """Call Gemini via REST. Returns parsed JSON dict. Raises RuntimeError."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise RuntimeError("GEMINI_API_KEY not configured")

    payload = {
        "contents": [{"parts": [{"text": _PROMPT_TEMPLATE.format(
            text=text, today=datetime.now().strftime("%Y-%m-%d (%A)"))}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
        },
    }

    for attempt in range(2):
        _throttle()
        try:
            resp = requests.post(
                _GEMINI_URL,
                headers={"x-goog-api-key": api_key},
                json=payload,
                timeout=_GEMINI_TIMEOUT,
            )
        except requests.exceptions.Timeout:
            raise RuntimeError("Gemini API request timed out")
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Cannot reach Gemini API: {e.__class__.__name__}")

        if resp.status_code == 429 and attempt == 0:
            log.warning("Gemini 429 — retrying once in 3s")
            time.sleep(3)
            continue
        if resp.status_code in (401, 403):
            raise RuntimeError("Gemini rejected the API key (check GEMINI_API_KEY)")
        if resp.status_code == 404:
            raise RuntimeError(
                f"Gemini model '{GEMINI_MODEL}' not found — set GEMINI_MODEL in .env")
        if not resp.ok:
            raise RuntimeError(f"Gemini API HTTP {resp.status_code}")
        break

    try:
        data = resp.json()
        parts = data["candidates"][0]["content"]["parts"]
        raw_text = "".join(p.get("text", "") for p in parts)
        return _parse_json_loose(raw_text)
    except (KeyError, IndexError, ValueError) as e:
        raise RuntimeError(f"Unexpected Gemini response: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Offline rule-based extractor
# ─────────────────────────────────────────────────────────────────────────────

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun",
     "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

_DESC_KEYWORDS = re.compile(
    r"\b(\d{1,2}\s*(?:-|to)?\s*\d{0,2}\s*(?:years?|yrs?)(?:\s*old)?|boy|girl|man|woman|"
    r"child|kid|elderly|old|young|teen(?:ager)?|male|female|wearing[^.,;]*|"
    r"(?:red|blue|green|black|white|grey|gray|yellow|pink|brown|orange|purple)\s+\w+|"
    r"beard|glasses|scar[^.,;]*|mole[^.,;]*|tall|short|slim|thin|heavy|fat|"
    r"(?:long|short)\s+\w*\s*hair|saree|kurta|uniform|jeans|shirt|t-shirt)\b",
    re.I,
)


def _offline_date(text: str, today: datetime):
    t = text.lower()
    if "day before yesterday" in t:
        return (today - timedelta(days=2)).date()
    if "yesterday" in t or "last night" in t:
        return (today - timedelta(days=1)).date()
    if re.search(r"\b(today|this (morning|afternoon|evening)|tonight|just now)\b", t):
        return today.date()

    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", t)
    if m:
        try:
            return datetime(int(m[1]), int(m[2]), int(m[3])).date()
        except ValueError:
            pass
    m = re.search(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b", t)  # dd/mm/yyyy
    if m:
        y = int(m[3]) + (2000 if len(m[3]) == 2 else 0)
        try:
            return datetime(y, int(m[2]), int(m[1])).date()
        except ValueError:
            pass
    month_re = r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*"
    m = (re.search(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?{month_re}\.?,?\s*(\d{{4}})?", t)
         or None)
    if m:
        day, mon, yr = int(m[1]), _MONTHS[m[2]], m[3]
    else:
        m = re.search(rf"\b{month_re}\.?\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s*(\d{{4}})?", t)
        if not m:
            return None
        mon, day, yr = _MONTHS[m[1]], int(m[2]), m[3]
    year = int(yr) if yr else today.year
    try:
        d = datetime(year, mon, day).date()
    except ValueError:
        return None
    if not yr and d > today.date():  # "3rd April" in January → last year
        d = d.replace(year=year - 1)
    return d


def _offline_time(text: str):
    t = text.lower()
    m = re.search(r"\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?", t)
    if m:
        h, mi, ap = int(m[1]), int(m[2]), (m[3] or "").replace(".", "")
    else:
        m = re.search(r"\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)", t)
        if not m:
            for word, hh in (("morning", 9), ("noon", 12), ("afternoon", 15),
                             ("evening", 18), ("night", 21)):
                if word in t:
                    return f"{hh:02d}:00"
            return None
        h, mi, ap = int(m[1]), 0, m[2].replace(".", "")
    if ap == "pm" and h < 12:
        h += 12
    if ap == "am" and h == 12:
        h = 0
    if not (0 <= h < 24 and 0 <= mi < 60):
        return None
    return f"{h:02d}:{mi:02d}"


def _offline_location(text: str) -> dict:
    low = text.lower()
    loc = {"landmark": None, "city": None, "state": None, "country": "India"}

    # Known places (longest match first so "assi ghat" beats "varanasi")
    hits = [k for k in sorted(_GAZETTEER, key=len, reverse=True)
            if re.search(rf"\b{re.escape(k)}\b", low)]
    cities = {"varanasi", "banaras", "benares", "kashi", "prayagraj", "allahabad",
              "lucknow", "kanpur", "agra", "gorakhpur", "patna", "new delhi", "delhi",
              "mumbai", "kolkata", "howrah", "chennai", "bengaluru", "bangalore",
              "hyderabad", "pune", "ahmedabad", "jaipur", "bhopal"}
    for h in hits:
        if h in cities and not loc["city"]:
            loc["city"] = h.title()
        elif h not in cities and not loc["landmark"]:
            loc["landmark"] = h.title() if len(h) > 3 else h.upper()

    if not loc["landmark"]:
        # Generic "near/at <Capitalised Words>" pattern
        m = re.search(
            r"\b(?:near|at|outside|around|opposite|behind|in front of)\s+(?:the\s+)?"
            r"((?:[A-Z][\w'.-]*\s?){1,5})", text)
        if m:
            cand = m.group(1).strip(" .,")
            if cand and (not loc["city"] or cand.lower() != loc["city"].lower()):
                loc["landmark"] = cand
    return loc


def _offline_extract(text: str) -> dict:
    now = datetime.now()
    loc = _offline_location(text)
    d = _offline_date(text, now)
    tm = _offline_time(text)
    desc_bits = []
    for m in _DESC_KEYWORDS.finditer(text):
        s = m.group(0).strip()
        if s.lower() not in (b.lower() for b in desc_bits):
            desc_bits.append(s)
    score = 15 + (35 if (loc["landmark"] or loc["city"]) else 0) \
        + (20 if d else 0) + min(len(desc_bits), 4) * 5
    return {
        "location": loc,
        "date": d.isoformat() if d else None,
        "time": tm,
        "description": ", ".join(desc_bits) or None,
        "confidence": min(score, 80),  # rule-based never claims >80
    }


# ─────────────────────────────────────────────────────────────────────────────
# Geocoding
# ─────────────────────────────────────────────────────────────────────────────

def _gazetteer_lookup(loc: dict):
    for key in ("landmark", "city"):
        v = (loc.get(key) or "").lower().strip()
        if not v:
            continue
        if v in _GAZETTEER:
            return _GAZETTEER[v]
        for name in sorted(_GAZETTEER, key=len, reverse=True):
            if re.search(rf"\b{re.escape(name)}\b", v):
                return _GAZETTEER[name]
    return None


def _nominatim(query: str):
    global _last_geo_call
    if not GEOPY_AVAILABLE or not query or os.getenv("DISABLE_ONLINE_GEOCODING"):
        return None
    with _geo_lock:
        if query in _geo_cache:
            return _geo_cache[query]
        wait = 1.0 - (time.time() - _last_geo_call)  # Nominatim policy: 1 req/s
        if wait > 0:
            time.sleep(wait)
        _last_geo_call = time.time()
        try:
            r = _geocoder.geocode(query, country_codes="in")
            result = (round(r.latitude, 6), round(r.longitude, 6)) if r else None
        except Exception as e:
            log.warning(f"Geocoding failed for '{query}': {e}")
            return None  # don't cache transient errors
        _geo_cache[query] = result
        return result


def _geocode(loc: dict):
    """Resolve a location dict to (lat, lng). Tries most→least specific."""
    parts = [loc.get("landmark"), loc.get("city"), loc.get("state")]
    queries = []
    full = ", ".join(p for p in parts if p)
    if full:
        queries.append(full)
    city_state = ", ".join(p for p in parts[1:] if p)
    if city_state and city_state != full:
        queries.append(city_state)

    for q in queries:
        hit = _nominatim(q)
        if hit:
            return hit
    hit = _gazetteer_lookup(loc)
    return hit if hit else (None, None)


# ─────────────────────────────────────────────────────────────────────────────
# Assemble output
# ─────────────────────────────────────────────────────────────────────────────

def _build_flat_output(extracted: dict, raw_text: str) -> dict:
    loc = extracted.get("location") or {}
    if isinstance(loc, str):
        loc = {"landmark": loc}
    if not isinstance(loc, dict):
        loc = {}
    loc = {k: (str(loc.get(k)).strip() if loc.get(k) not in (None, "", "null") else None)
           for k in ("landmark", "city", "state", "country")}
    loc["country"] = loc["country"] or "India"

    has_place = bool(loc["landmark"] or loc["city"] or loc["state"])
    location_str = ", ".join(p for p in (loc["landmark"], loc["city"], loc["state"],
                                         loc["country"]) if p) if has_place else None

    latitude, longitude = _geocode(loc) if has_place else (None, None)

    raw_date, raw_time = extracted.get("date"), extracted.get("time")
    sighted_at = None
    if raw_date and re.match(r"^\d{4}-\d{2}-\d{2}$", str(raw_date)):
        if raw_time and re.match(r"^\d{1,2}:\d{2}", str(raw_time)):
            hh, mm = str(raw_time).split(":")[:2]
            sighted_at = f"{raw_date}T{int(hh):02d}:{mm[:2]}:00"
        else:
            sighted_at = f"{raw_date}T00:00:00"

    try:
        c = float(extracted.get("confidence", 50))
        conf_int = max(0, min(100, int(round(c * 100 if c <= 1 else c))))
    except (ValueError, TypeError):
        conf_int = 50

    description = str(extracted.get("description") or "").strip() or None

    return {
        "location":     location_str,
        "latitude":     latitude,
        "longitude":    longitude,
        "sighted_at":   sighted_at,
        "confidence":   round(conf_int / 100, 2),
        "description":  description,
        "location_detail": loc,
        "raw_text":     raw_text,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    }


def extract_sighting(text: str, person_id: str = "UNKNOWN") -> dict:
    """
    Main public function. Never raises for API problems — falls back to the
    offline extractor and records a `warning` instead.
    """
    if not text or not text.strip():
        raise ValueError("Sighting text cannot be empty.")
    text = text.strip()

    warning, engine = None, "gemini"
    try:
        extracted = _call_gemini(text)
    except Exception as e:
        warning = f"{e} — used offline extractor"
        engine = "offline"
        log.info(f"Gemini unavailable ({e}); using offline extractor")
        extracted = _offline_extract(text)

    result = _build_flat_output(extracted, text)
    result["engine"] = engine
    result["person_id"] = person_id
    if warning:
        result["warning"] = warning

    log.info(f"[{engine}] location={result['location']!r} "
             f"lat={result['latitude']} lng={result['longitude']} "
             f"sighted_at={result['sighted_at']} conf={result['confidence']}")
    return result


def extract_batch(texts: list, person_id: str = "UNKNOWN") -> list:
    results = []
    for i, text in enumerate(texts, 1):
        log.info(f"[{i}/{len(texts)}] Processing sighting...")
        try:
            results.append(extract_sighting(text, person_id=person_id))
        except Exception as e:
            log.error(f"  Failed: {e}")
            results.append({
                "person_id": person_id, "error": str(e), "raw_text": text,
                "location": None, "latitude": None, "longitude": None,
                "sighted_at": None, "confidence": 0,
                "extracted_at": datetime.now(timezone.utc).isoformat(),
            })
    return results


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    sample = " ".join(sys.argv[1:]) or (
        "A boy around 10 years old was spotted near Assi Ghat, Varanasi "
        "yesterday at 5pm wearing a blue school uniform.")
    print(json.dumps(extract_sighting(sample, person_id="DEMO-001"), indent=2))
