"""
test_nlp.py
===========
Test script for extractor.py
Tests 3 different sighting descriptions and pretty-prints results.
Runs WITHOUT making live API calls when GEMINI_API_KEY is absent —
falls back to a mock so you can verify schema/logic offline.
"""
import json
import os
import sys
import logging
from dotenv import load_dotenv  # ← add karo
load_dotenv()                   # ← add karo
log = logging.getLogger("test_nlp")
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S")

# ── 3 test sightings ─────────────────────────────────────────────────────────
TEST_SIGHTINGS = [
    {
        "id": "MP-001",
        "text": (
            "A child was seen near Connaught Place, Delhi "
            "on 3rd April wearing a red shirt and blue jeans. "
            "The boy appeared to be around 8-10 years old."
        ),
    },
    {
        "id": "MP-002",
        "text": (
            "An elderly woman, approximately 65-70 years old with grey hair "
            "and a green saree, was spotted wandering alone near "
            "Dadar Station, Mumbai yesterday evening around 6 PM. "
            "She seemed confused and was carrying a small cloth bag."
        ),
    },
    {
        "id": "MP-003",
        "text": (
            "Someone matching the missing person's description was seen "
            "at a roadside stall. Short, wearing dark clothes."
            # intentionally vague — should score low confidence
        ),
    },
]


# ── Minimal mock for offline testing ─────────────────────────────────────────
_MOCK_RESPONSES = [
    {
        "location": {"city": "Delhi", "landmark": "Connaught Place",
                     "state": "Delhi", "country": "India"},
        "date": "2024-04-03", "time": None,
        "description": "boy, 8-10 years, red shirt, blue jeans",
        "confidence": 88,
    },
    {
        "location": {"city": "Mumbai", "landmark": "Dadar Station",
                     "state": "Maharashtra", "country": "India"},
        "date": None, "time": "18:00",
        "description": "elderly woman, ~65-70 years, grey hair, green saree, confused",
        "confidence": 74,
    },
    {
        "location": {"city": None, "landmark": None,
                     "state": None, "country": "India"},
        "date": None, "time": None,
        "description": "short, dark clothes",
        "confidence": 18,
    },
]


def _mock_extract(text: str, person_id: str, mock_data: dict) -> dict:
    """Return a mock extraction result matching extractor.py's schema."""
    from datetime import datetime, timezone
    return {
        "person_id":    person_id,
        "location":     mock_data["location"],
        "date":         mock_data["date"],
        "time":         mock_data["time"],
        "description":  mock_data["description"],
        "confidence":   mock_data["confidence"],
        "raw_text":     text,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "_mock":        True,
    }


def _print_result(result: dict, index: int) -> None:
    """Pretty-print one extraction result."""
    sep = "─" * 58
    print(f"\n{sep}")
    print(f"  TEST {index}  |  Person: {result.get('person_id','?')}")
    print(sep)

    if "error" in result:
        print(f"  ❌ ERROR: {result['error']}")
        print(f"  Raw text: {result.get('raw_text','')[:80]}")
        return

    loc  = result.get("location", {})
    conf = result.get("confidence", 0)

    # Confidence bar (visual)
    filled = int(conf / 5)
    bar = "█" * filled + "░" * (20 - filled)

    print(f"  📍 Location  : {loc.get('landmark') or '—'}, "
          f"{loc.get('city') or '—'}, {loc.get('state') or '—'}, "
          f"{loc.get('country') or '—'}")
    print(f"  📅 Date      : {result.get('date') or '—'}")
    print(f"  🕐 Time      : {result.get('time') or '—'}")
    print(f"  🧍 Desc      : {result.get('description') or '—'}")
    print(f"  📊 Confidence: [{bar}] {conf}%")
    if result.get("_mock"):
        print("  ⚠️  (mock response — no API key present)")
    print(f"\n  Input: \"{result['raw_text'][:90]}\"")


def run_tests(use_live_api: bool = True) -> list:
    """
    Run all 3 test extractions.
    If use_live_api=False (or no API key), uses mock responses.
    Returns list of result dicts.
    """
    results = []

    print("\n" + "═" * 58)
    print("  MISSING PERSONS — NLP EXTRACTOR TEST SUITE")
    print("═" * 58)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        log.warning("GEMINI_API_KEY not set — running with mock responses.")
        use_live_api = False
    else:
        log.info("GEMINI_API_KEY found — using live Gemini API.")

    if use_live_api:
        try:
            from extractor import extract_sighting
        except ImportError as e:
            log.error(f"Cannot import extractor.py: {e}")
            sys.exit(1)

    for i, test in enumerate(TEST_SIGHTINGS):
        log.info(f"Running test {i+1}/{len(TEST_SIGHTINGS)}...")
        try:
            if use_live_api:
                result = extract_sighting(test["text"], person_id=test["id"])
            else:
                result = _mock_extract(test["text"], test["id"], _MOCK_RESPONSES[i])
            results.append(result)
        except Exception as e:
            results.append({
                "person_id": test["id"],
                "error": str(e),
                "raw_text": test["text"],
            })

    # ── Print results ─────────────────────────────────────────────────────────
    for i, r in enumerate(results, 1):
        _print_result(r, i)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "═" * 58)
    successes = sum(1 for r in results if "error" not in r)
    print(f"  Results: {successes}/{len(results)} extracted successfully")

    confidences = [r["confidence"] for r in results if "confidence" in r]
    if confidences:
        print(f"  Avg confidence: {sum(confidences)/len(confidences):.0f}%")
        print(f"  Range: {min(confidences)}% – {max(confidences)}%")

    print("═" * 58 + "\n")

    # ── Save to JSON ──────────────────────────────────────────────────────────
    out_file = "test_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    log.info(f"Full results saved → {out_file}")

    return results


if __name__ == "__main__":
    # Pass --mock flag to force offline mock mode
    force_mock = "--mock" in sys.argv
    run_tests(use_live_api=(not force_mock))
