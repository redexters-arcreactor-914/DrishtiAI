
# DrishtiAI 🔍

**Team:** PowerPuff_Boys  
**Hackathon Project** — AI-powered Missing Persons Identification System

---

## 🧠 What it does

DrishtiAI is a full-stack system that helps identify and locate missing persons using:
- **Face Matching** — DeepFace / InsightFace / OpenCV for photo-based identification
- **NLP Extraction** — Gemini API to extract structured data from unstructured reports
- **Geospatial Visualization** — Folium-based live map of sighting locations
- **React Dashboard** — Case registration, sighting feed, match results, and live map UI

---

## 🏗️ Project Structure

\`\`\`
PowerPuff_Boys/
├── backend/
│   ├── app.py                  # Flask API server
│   ├── seed_data.py            # Database seeding
│   ├── face_matching/
│   │   └── face_matcher.py     # Face recognition pipeline
│   └── nlp_geo/
│       ├── extractor.py        # NLP extraction via Gemini API
│       └── map_builder.py      # Geospatial map generation
└── frontend/
    └── projectx/
        └── src/pages/
            ├── CaseRegistration.jsx
            ├── SightingFeed.jsx
            ├── MatchResults.jsx
            └── LiveMap.jsx
\`\`\`

---

## ⚙️ Setup Instructions

### Backend
\`\`\`bash
cd backend
pip install -r requirements.txt
# Create a .env file with your GEMINI_API_KEY
python seed_data.py
python app.py
\`\`\`

### Frontend
\`\`\`bash
cd frontend/projectx
npm install
npm run dev
\`\`\`

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React, JSX |
| Backend | Python, Flask |
| Face Recognition | DeepFace, InsightFace, OpenCV |
| NLP | Google Gemini API |
| Maps | Folium |
| Database | SQLite |

---

##  Note

\`.env\` file (containing API keys) is excluded from this repo for security.  
Create your own \`.env\` in \`backend/\` with:
\`\`\`
GEMINI_API_KEY=your_key_here
\`\`\`
"@ | Out-File -FilePath README.md -Encoding utf8