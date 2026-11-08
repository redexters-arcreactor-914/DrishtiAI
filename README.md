# DrishtiAI 🔍

**Team:** PowerPuff_Boys — Hackathon Project
AI-powered Missing Persons Identification System

---

## 🧠 What it does

- **Case registration** — register a missing person with a reference photo.
- **Sighting feed** — paste a free-text sighting report; location, date/time and
  description are extracted automatically (Gemini if a key is configured,
  otherwise a built-in offline rule-based extractor) and geocoded.
- **Face matching** — sighting photos linked to a case are compared against the
  case's reference photo (DeepFace ArcFace → InsightFace → histogram fallback).
  Operators flag/dismiss candidates; reviews are saved and audited.
- **Live map** — every geolocated sighting, coloured per case with a
  chronological trail; filter by case.
- **Cases + audit log** — case status (open / found / closed) and an activity log.

---

## 🏗️ Project structure

```
backend/
  app.py                    Flask API (SQLite, auto-created/migrated)
  seed_data.py              Demo data (python seed_data.py [--force])
  test_app.py               API tests
  face_matching/face_matcher.py
  nlp_geo/extractor.py      Gemini + offline extractor, geocoding
  nlp_geo/map_builder.py    Folium map
frontend/projectx/          React (Create React App + Tailwind)
  src/api.js                Single API client
  src/pages/                CaseRegistration, CasesList, SightingFeed, MatchResults, LiveMap
```

---

## ⚙️ Setup

### Backend (Python 3.10–3.12 recommended for DeepFace/TensorFlow)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # optional: add GEMINI_API_KEY
python seed_data.py           # optional demo data
python app.py                 # http://127.0.0.1:5000
```

`GET /api/health` shows which face engines and NLP mode are active. Without
DeepFace installed the matcher falls back to colour histograms — those results
are flagged **low reliability** in the UI because they are not face recognition.

### Frontend

```bash
cd frontend/projectx
npm install
npm start                     # http://localhost:3000
```

Point it at a different backend with `REACT_APP_API_URL` in `frontend/projectx/.env`.

### Tests

```bash
cd backend
python -m pytest -q test_app.py face_matching/test_face_matcher.py
```

---

## 🔌 API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register` | Create case (multipart; `photo` optional) |
| GET | `/api/cases?status=&q=` | List cases |
| GET / PATCH | `/api/cases/<id>` | Case detail / set `status` |
| POST | `/api/sighting` | Add sighting (JSON or multipart with `photo`) |
| GET | `/api/sightings?case_id=&limit=` | List sightings |
| POST | `/api/match` | Re-run face matching for a case |
| GET | `/api/matches?case_id=&status=` | List match candidates |
| PATCH | `/api/matches/<id>` | Review: `pending` / `flagged` / `dismissed` |
| GET | `/api/map?case_id=&fmt=json` | Map HTML (or JSON points) |
| GET | `/api/audit` | Audit log |
| GET | `/api/photo/<file>` | Uploaded photo |
| GET | `/api/health` | Status |

---

## 🛠️ Tech stack

React · Tailwind · Flask · SQLite · DeepFace / InsightFace / OpenCV · Gemini API · Folium / Leaflet · geopy

## 🔐 Note

`.env` files and `backend/uploads/` are git-ignored. Never commit API keys.
