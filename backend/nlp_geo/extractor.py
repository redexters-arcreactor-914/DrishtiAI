"""
extractor.py
============
NLP Sighting Extractor — DrishtiAI
Uses Gemini 2.0 Flash to extract structured data from raw sighting text.

Output schema (flat — matches app.py DB insert):
  location    : str   — human readable "Landmark, City, State"
  latitude    : float — geocoded (None if geopy unavailable)
  longitude   : float — geocoded (None if geopy unavailable)
  sighted_at  : str   — ISO datetime string or None
  confidence  : float — 0.0 to 1.0
  description : str   — extracted physical description
  raw_text    : str   — original input
  extracted_at: str   — ISO timestamp of extraction
"""

import os
import json
import re
import logging
from datetime import datetime, timezone
import time

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("extractor")

# ── Gemini REST endpoint ──────────────────────────────────────────────────────
_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
_LAST_CALL_TIME = 0
_MIN_INTERVAL   = 20  # seconds between Gemini calls (free tier: 5 RPM = 12s)

# ── Geocoder (optional) ───────────────────────────────────────────────────────
try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut
    _geocoder = Nominatim(user_agent="drishti_ai_missing_persons")
    GEOPY_AVAILABLE = True
    log.info("geopy loaded ✓")
except ImportError:
    _geocoder = None
    GEOPY_AVAILABLE = False
    log.warning("geopy not installed — geocoding disabled.")

# ── Extraction prompt ─────────────────────────────────────────────────────────
_PROMPT_TEMPLATE = """
You are an information extraction engine for a missing persons tracking system.

Extract information from the sighting report below and return ONLY a valid JSON
object. No markdown, no backticks, no explanation — raw JSON only.

Sighting report:
\"{text}\"

Return this exact JSON shape (use null for missing fields):
{{
  "location": {{
    "city":     "<city name or null>",
    "landmark": "<specific place/street or null>",
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


def _rate_limit_wait():
    """Ensure minimum interval between Gemini API calls."""
    global _LAST_CALL_TIME
    elapsed = time.time() - _LAST_CALL_TIME
    if elapsed < _MIN_INTERVAL:
        wait = _MIN_INTERVAL - elapsed
        log.info(f"Rate limit: waiting {wait:.1f}s before Gemini call...")
        time.sleep(wait)
    _LAST_CALL_TIME = time.time()


def _call_gemini(text: str) -> dict:
    """
    Call Gemini via REST API with rate limiting.
    Returns parsed JSON dict. Raises RuntimeError on failure.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY not found in .env file.")

    # ← rate limit BEFORE the call (not after)
    _rate_limit_wait()

    payload = {
        "contents": [{"parts": [{"text": _PROMPT_TEMPLATE.format(text=text)}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 512,
        },
    }

    try:
        response = requests.post(
            _GEMINI_URL,
            params={"key": api_key},
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
    except requests.exceptions.Timeout:
        raise RuntimeError("Gemini API request timed out.")
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Cannot reach Gemini API. Check internet connection.")
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code
        if status == 429:
            log.warning("429 received — waiting 30s before retry...")
            time.sleep(30)
            raise RuntimeError("Gemini rate limit hit. Sighting saved without NLP. Retry in a moment.")
        elif status == 403:
            raise RuntimeError("Gemini API 403 Forbidden — check your API key in .env")
        else:
            raise RuntimeError(f"Gemini API HTTP error {status}: {e}")

    try:
        data     = response.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Gemini response structure: {e}")

    # Strip markdown fences if model adds them
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text).strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Gemini returned non-JSON: {e}\nRaw: {raw_text[:300]}")


def _geocode(location_str: str):
    """
    Convert a location string to (latitude, longitude).
    Returns (lat, lng) tuple or (None, None) if unavailable.
    """
    if not GEOPY_AVAILABLE or not location_str:
        return None, None
    try:
        result = _geocoder.geocode(location_str, timeout=10)
        if result:
            return round(result.latitude, 6), round(result.longitude, 6)
    except Exception as e:
        log.warning(f"Geocoding failed for '{location_str}': {e}")
    return None, None


def _build_flat_output(extracted: dict, raw_text: str) -> dict:
    """
    Convert Gemini's nested output into the flat schema app.py expects:
      location, latitude, longitude, sighted_at, confidence, description
    """
    # ── location string ───────────────────────────────────────────────────────
    loc = extracted.get("location") or {}
    if not isinstance(loc, dict):
        loc = {}

    parts = [
        loc.get("landmark"),
        loc.get("city"),
        loc.get("state"),
        loc.get("country") or "India",
    ]
    location_str = ", ".join(p for p in parts if p)  # e.g. "Assi Ghat, Varanasi, UP, India"

    # ── geocode to lat/lng ────────────────────────────────────────────────────
    latitude, longitude = _geocode(location_str)

    # ── sighted_at: combine date + time into ISO string ───────────────────────
    raw_date = extracted.get("date")
    raw_time = extracted.get("time")
    sighted_at = None

    if raw_date and re.match(r"^\d{4}-\d{2}-\d{2}$", str(raw_date)):
        if raw_time and re.match(r"^\d{1,2}:\d{2}$", str(raw_time)):
            sighted_at = f"{raw_date}T{raw_time}:00"
        else:
            sighted_at = f"{raw_date}T00:00:00"

    # ── confidence: store as 0.0–1.0 float ───────────────────────────────────
    try:
        conf_int = max(0, min(100, int(extracted.get("confidence", 50))))
    except (ValueError, TypeError):
        conf_int = 50
    confidence = round(conf_int / 100, 2)   # 0.0–1.0

    # ── description ───────────────────────────────────────────────────────────
    description = str(extracted.get("description") or "").strip() or None

    return {
        # flat keys app.py reads directly
        "location":     location_str or None,
        "latitude":     latitude,
        "longitude":    longitude,
        "sighted_at":   sighted_at,
        "confidence":   confidence,
        "description":  description,
        # extra context kept for the nlp_data JSON blob
        "location_detail": {
            "city":     loc.get("city"),
            "landmark": loc.get("landmark"),
            "state":    loc.get("state"),
            "country":  loc.get("country") or "India",
        },
        "raw_text":     raw_text,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    }


def extract_sighting(text: str, person_id: str = "UNKNOWN") -> dict:
    """
    Main public function.
    Takes raw sighting text, calls Gemini, geocodes, returns flat dict.

    Parameters
    ----------
    text      : str — raw sighting report
    person_id : str — case identifier (optional)

    Returns
    -------
    Flat dict with: location, latitude, longitude, sighted_at,
                    confidence, description, raw_text, extracted_at
    """
    if not text or not text.strip():
        raise ValueError("Sighting text cannot be empty.")

    log.info(f"Extracting: '{text[:80]}{'...' if len(text) > 80 else ''}'")

    raw_extracted = _call_gemini(text.strip())
    result = _build_flat_output(raw_extracted, text.strip())
    result["person_id"] = person_id

    log.info(
        f"  → location='{result['location']}' | "
        f"lat={result['latitude']} | lng={result['longitude']} | "
        f"sighted_at={result['sighted_at']} | "
        f"confidence={int(result['confidence']*100)}%"
    )

    return result


def extract_batch(texts: list, person_id: str = "UNKNOWN") -> list:
    """
    Extract from multiple sighting reports with rate limiting between calls.
    """
    results = []
    for i, text in enumerate(texts, 1):
        log.info(f"[{i}/{len(texts)}] Processing sighting...")
        try:
            results.append(extract_sighting(text, person_id=person_id))
        except Exception as e:
            log.error(f"  Failed: {e}")
            results.append({
                "person_id":    person_id,
                "error":        str(e),
                "raw_text":     text,
                "location":     None,
                "latitude":     None,
                "longitude":    None,
                "sighted_at":   None,
                "confidence":   0,
                "extracted_at": datetime.now(timezone.utc).isoformat(),
            })
    return results


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else (
        "A boy around 10 years old was spotted near Assi Ghat, "
        "Varanasi on 3rd April 2026 at 5pm wearing a blue school uniform."
    )
    result = extract_sighting(text, person_id="DEMO-001")
    print(json.dumps(result, indent=2))
    
    
    
    # """
# extractor.py
# ============
# NLP Sighting Extractor — Part A
# Uses Gemini 2.0 Flash to extract structured data from raw sighting text.
# """

# import os
# import json
# import re
# import logging
# from datetime import datetime, timezone
# import time

# import requests
# from dotenv import load_dotenv

# load_dotenv()  # reads GEMINI_API_KEY from .env file

# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s [%(levelname)s] %(message)s",
#     datefmt="%H:%M:%S",
# )
# log = logging.getLogger("extractor")

# # ── Gemini REST endpoint (no SDK needed — works on Python 3.13 free tier) ────
# _GEMINI_URL = (
#     "https://generativelanguage.googleapis.com/v1beta/models/"
#     "gemini-2.0-flash:generateContent"
# )

# # ── Structured extraction prompt ──────────────────────────────────────────────
# _PROMPT_TEMPLATE = """
# You are an information extraction engine for a missing persons tracking system.

# Extract information from the sighting report below and return ONLY a valid JSON
# object. No markdown, no backticks, no explanation — raw JSON only.

# Sighting report:
# \"{text}\"

# Return this exact JSON shape (use null for missing fields):
# {{
#   "location": {{
#     "city": "<city name or null>",
#     "landmark": "<specific place/street or null>",
#     "state": "<state or null>",
#     "country": "<country, default India if unclear>"
#   }},
#   "date": "<YYYY-MM-DD or null>",
#   "time": "<HH:MM in 24h or null>",
#   "description": "<comma-separated physical details: age, gender, clothing, features>",
#   "confidence": <integer 0-100>
# }}

# Confidence guide:
#   85-100 = exact location + clear date + good description
#   65-84  = location + date present, partial description
#   40-64  = location OR date missing, vague description
#   10-39  = very little useful information
# """


# def _call_gemini(text: str) -> dict:
#     """
#     Call Gemini 1.5 Flash via REST API.
#     Returns parsed JSON dict from model response.
#     Raises RuntimeError on API failure or bad response.
#     """
#     api_key = os.getenv("GEMINI_API_KEY")
#     if not api_key:
#         raise EnvironmentError(
#             "GEMINI_API_KEY not found. Add it to your .env file."
#         )

#     payload = {
#         "contents": [
#             {
#                 "parts": [
#                     {"text": _PROMPT_TEMPLATE.format(text=text)}
#                 ]
#             }
#         ],
#         "generationConfig": {
#             "temperature": 0.1,       # low temp → consistent structured output
#             "maxOutputTokens": 512,
#         },
#     }

#     try:
#         response = requests.post(
#             _GEMINI_URL,
#             params={"key": api_key},
#             json=payload,
#             timeout=15,
#         )
#         response.raise_for_status()
#     except requests.exceptions.Timeout:
#         raise RuntimeError("Gemini API request timed out after 15 seconds.")
#     except requests.exceptions.ConnectionError:
#         raise RuntimeError("Cannot reach Gemini API. Check your internet connection.")
#     except requests.exceptions.HTTPError as e:
#         status = e.response.status_code
#         if status == 400:
#             raise RuntimeError("Gemini API returned 400 Bad Request. Check your prompt.")
#         elif status == 403:
#             raise RuntimeError("Gemini API returned 403 Forbidden. Check your API key.")
#         elif status == 429:
#             raise RuntimeError("Gemini API rate limit hit. Wait and retry.")
#         else:
#             raise RuntimeError(f"Gemini API HTTP error {status}: {e}")

#     # ── Parse response ────────────────────────────────────────────────────────
#     try:
#         data = response.json()
#         raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
#     except (KeyError, IndexError, json.JSONDecodeError) as e:
#         raise RuntimeError(f"Unexpected Gemini response structure: {e}\n{response.text[:400]}")

#     # Strip markdown fences if the model wraps its output anyway
#     raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
#     raw_text = re.sub(r"\s*```$", "", raw_text).strip()

#     try:
#         return json.loads(raw_text)
#     except json.JSONDecodeError as e:
#         raise RuntimeError(
#             f"Gemini returned non-JSON output: {e}\nRaw: {raw_text[:300]}"
#         )


# def _validate_and_clean(extracted: dict, raw_text: str) -> dict:
#     """
#     Validate and normalise the extracted dict.
#     Fills in defaults for missing/malformed fields so callers always
#     get a consistent schema regardless of model quirks.
#     """
#     # ── location ──────────────────────────────────────────────────────────────
#     loc = extracted.get("location") or {}
#     if not isinstance(loc, dict):
#         loc = {}
#     location = {
#         "city":     loc.get("city")     or None,
#         "landmark": loc.get("landmark") or None,
#         "state":    loc.get("state")    or None,
#         "country":  loc.get("country")  or "India",
#     }

#     # ── date ──────────────────────────────────────────────────────────────────
#     raw_date = extracted.get("date")
#     date_clean = None
#     if raw_date:
#         # Accept YYYY-MM-DD; reject anything else gracefully
#         if re.match(r"^\d{4}-\d{2}-\d{2}$", str(raw_date)):
#             date_clean = str(raw_date)
#         else:
#             log.warning(f"Ignoring non-ISO date: '{raw_date}'")

#     # ── time ──────────────────────────────────────────────────────────────────
#     raw_time = extracted.get("time")
#     time_clean = None
#     if raw_time and re.match(r"^\d{1,2}:\d{2}$", str(raw_time)):
#         time_clean = str(raw_time)

#     # ── description ───────────────────────────────────────────────────────────
#     description = str(extracted.get("description") or "").strip() or None

#     # ── confidence ────────────────────────────────────────────────────────────
#     try:
#         confidence = max(0, min(100, int(extracted.get("confidence", 50))))
#     except (ValueError, TypeError):
#         confidence = 50

#     return {
#         "location":    location,
#         "date":        date_clean,
#         "time":        time_clean,
#         "description": description,
#         "confidence":  confidence,
#         "raw_text":    raw_text,
#         "extracted_at": datetime.now(timezone.utc).isoformat(),
#     }


# def extract_sighting(text: str, person_id: str = "UNKNOWN") -> dict:
#     """
#     Main public function.
#     Takes a raw sighting report string, calls Gemini, and returns
#     a clean structured dict.

#     Parameters
#     ----------
#     text : str
#         Raw sighting report in natural language.
#     person_id : str
#         Identifier for the missing person this sighting relates to.

#     Returns
#     -------
#     dict with keys: person_id, location, date, time,
#                     description, confidence, raw_text, extracted_at

#     Raises
#     ------
#     ValueError  — if text is empty
#     RuntimeError — on API or parsing failure
#     """
#     if not text or not text.strip():
#         raise ValueError("Sighting text cannot be empty.")

#     log.info(f"Extracting: '{text[:80]}{'...' if len(text) > 80 else ''}'")

#     raw_extracted = _call_gemini(text.strip())
#     clean = _validate_and_clean(raw_extracted, text.strip())
#     clean["person_id"] = person_id

#     log.info(
#         f"  → {clean['location']['city'] or 'unknown city'} | "
#         f"date={clean['date']} | confidence={clean['confidence']}%"
#     )
#     time.sleep(10)    #rate limit exceed kr rhi h firse
#     return clean


# def extract_batch(
#     texts: list,
#     person_id: str = "UNKNOWN",
# ) -> list:
#     """
#     Extract structured data from multiple sighting reports.

#     Parameters
#     ----------
#     texts : list of str
#     person_id : str

#     Returns
#     -------
#     list of dicts (same schema as extract_sighting, plus 'error' key on failure)
#     """
#     results = []
#     for i, text in enumerate(texts, 1):
#         log.info(f"[{i}/{len(texts)}] Processing sighting...")
#         try:
#             results.append(extract_sighting(text, person_id=person_id))
#         except Exception as e:
#             log.error(f"  Failed: {e}")
#             results.append({
#                 "person_id":    person_id,
#                 "error":        str(e),
#                 "raw_text":     text,
#                 "extracted_at": datetime.now(timezone.utc).isoformat(),
#             })
#         time.sleep(10) # rate limit delay between API calls
#     return results


# # ── CLI convenience ───────────────────────────────────────────────────────────
# if __name__ == "__main__":
#     import sys
#     text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else (
#         "A boy around 10 years old was spotted near India Gate, "
#         "New Delhi on 2nd April 2024 wearing a blue school uniform."
#     )
#     result = extract_sighting(text, person_id="DEMO-001")
#     print(json.dumps(result, indent=2))
