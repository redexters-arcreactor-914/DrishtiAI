# Missing Persons Face Matching Module

A production-ready face matching pipeline for AI hackathon use.

---

## Quick Start

```bash
pip install -r requirements.txt

python run_matcher.py \
  --reference  data/missing/john_doe.jpg \
  --sightings  data/sightings/ \
  --output     results/matches.json \
  --threshold  0.6 \
  --top-k      5
```

---

## Python API

```python
from face_matcher import FaceMatcher

matcher = FaceMatcher(threshold=0.6, top_k=5)

results = matcher.match(
    reference_image="data/missing/john_doe.jpg",
    sightings_folder="data/sightings/",
    output_json="results/matches.json",   # optional
)

# results is a list of dicts, highest confidence first:
# [
#   {
#     "filename":   "sighting_42.jpg",
#     "filepath":   "data/sightings/sighting_42.jpg",
#     "confidence": 87.34,          # 0-100 %
#     "confidence_raw": 0.8734,     # 0-1
#     "face_location": {
#       "x": 120, "y": 80, "width": 200, "height": 220
#     },
#     "engines_used": ["deepface", "insightface"]
#   },
#   ...
# ]
```

---

## Architecture

```
reference image
      │
      ▼
 _preprocess()         ← CLAHE + denoise + upscale
      │
      ├─── DeepFace.represent()    → 512-d ArcFace embedding
      └─── InsightFace.get()       → 512-d ArcFace embedding
                │
                │   (stored once, reused for every sighting)
                ▼
  for each sighting image:
      │
      ├─── _preprocess()
      │
      ├─── DeepFace embed  → cosine_sim  (primary)
      ├─── InsightFace embed → cosine_sim (fallback)
      └─── Histogram corr             (last resort)
                │
                ▼
        average scores → confidence %
                │
                ▼
        filter by threshold
                │
                ▼
        rank, take top-k → JSON
```

---

## Robustness Handling

| Challenge          | Strategy                                              |
|--------------------|-------------------------------------------------------|
| Low quality        | CLAHE + Gaussian denoise preprocessing                |
| Small images       | Auto-upscale to ≥ 160 px before inference             |
| Partial / occluded | `enforce_detection=False` in DeepFace                 |
| Engine failure     | DeepFace → InsightFace → histogram (3-tier fallback)  |
| Non-image files    | Extension whitelist; silently skipped                 |
| Corrupt images     | try/except around each sighting; logged & skipped     |

---

## Tests

```bash
pytest test_face_matcher.py -v
```

---

## Threshold Guide

| Use Case              | Recommended Threshold |
|-----------------------|-----------------------|
| High-recall search    | 0.45 – 0.55           |
| Balanced (default)    | 0.60                  |
| High-precision alert  | 0.75 – 0.85           |
