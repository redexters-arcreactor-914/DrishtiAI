"""
run_matcher.py
==============
CLI wrapper for FaceMatcher.
Usage examples:

    # Basic run
    python run_matcher.py \
        --reference data/missing/john_doe.jpg \
        --sightings data/sightings/ \
        --output results/matches.json

    # Stricter threshold, show top-3
    python run_matcher.py \
        --reference data/missing/jane.png \
        --sightings data/sightings/ \
        --threshold 0.75 \
        --top-k 3 \
        --output results/jane_matches.json
"""

import argparse
import json
import sys
from face_matcher import FaceMatcher


def parse_args():
    p = argparse.ArgumentParser(
        description="Missing Persons Face Matching System",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--reference",  required=True,
                   help="Path to missing person reference image")
    p.add_argument("--sightings",  required=True,
                   help="Folder of sighting images to scan")
    p.add_argument("--output",     default="results/matches.json",
                   help="Output JSON file path")
    p.add_argument("--threshold",  type=float, default=0.6,
                   help="Minimum confidence score (0.0–1.0)")
    p.add_argument("--top-k",      type=int,   default=5,
                   help="Maximum number of top matches to return")
    p.add_argument("--verbose",    action="store_true",
                   help="Enable debug logging")
    return p.parse_args()


def main():
    args = parse_args()

    if args.verbose:
        import logging
        logging.getLogger("FaceMatcher").setLevel(logging.DEBUG)

    matcher = FaceMatcher(threshold=args.threshold, top_k=args.top_k)

    try:
        matches = matcher.match(
            reference_image=args.reference,
            sightings_folder=args.sightings,
            output_json=args.output,
        )
    except (FileNotFoundError, NotADirectoryError) as e:
        print(f"\n[ERROR] {e}", file=sys.stderr)
        sys.exit(1)

    # ── Pretty-print results to stdout ────────────────────────────────────────
    print("\n" + "═" * 55)
    print("  MISSING PERSONS FACE MATCH — TOP RESULTS")
    print("═" * 55)

    if not matches:
        print("  No matches found above the confidence threshold.")
    else:
        for rank, m in enumerate(matches, 1):
            loc = m["face_location"]
            print(
                f"\n  #{rank}  {m['filename']}\n"
                f"      Confidence : {m['confidence']:.1f}%\n"
                f"      Face bbox  : "
                f"x={loc['x']} y={loc['y']} "
                f"w={loc['width']} h={loc['height']}\n"
                f"      Engines    : {', '.join(m['engines_used'])}"
            )

    print("\n" + "═" * 55)
    print(f"  Full results saved → {args.output}")
    print("═" * 55 + "\n")


if __name__ == "__main__":
    main()
