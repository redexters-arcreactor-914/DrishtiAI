"""
API tests for app.py — run with:  cd backend && python -m pytest -q test_app.py
Uses a temporary DB/upload dir and the offline NLP extractor (no network).
"""
import io
import os
import sys
import importlib
from pathlib import Path

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DRISHTI_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("DRISHTI_UPLOADS", str(tmp_path / "uploads"))
    monkeypatch.setenv("DISABLE_ONLINE_GEOCODING", "1")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    sys.path.insert(0, str(Path(__file__).parent))
    import app as app_module
    app_module = importlib.reload(app_module)
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c


def _jpg(color=(80, 120, 160)):
    img = np.full((200, 160, 3), color, np.uint8)
    cv2.circle(img, (80, 90), 50, (180, 200, 230), -1)
    ok, buf = cv2.imencode(".jpg", img)
    return io.BytesIO(buf.tobytes())


def _register(client, name="Test Person", photo=True):
    data = {"name": name, "age": "10", "gender": "male",
            "lastSeenLocation": "Assi Ghat, Varanasi", "dateLastSeen": "2026-01-01"}
    if photo:
        data["photo"] = (_jpg(), "ref.jpg")
    r = client.post("/api/register", data=data, content_type="multipart/form-data")
    assert r.status_code == 201, r.json
    return r.json["case_id"]


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json["status"] == "ok"


def test_register_requires_name(client):
    r = client.post("/api/register", data={"name": "  "})
    assert r.status_code == 400


def test_register_rejects_bad_age_and_non_image(client):
    assert client.post("/api/register", data={"name": "A", "age": "abc"}).status_code == 400
    r = client.post("/api/register", data={"name": "A", "photo": (io.BytesIO(b"nope"), "x.jpg")},
                    content_type="multipart/form-data")
    assert r.status_code == 400


def test_cases_list_exposes_photo_url_not_path(client):
    _register(client)
    case = client.get("/api/cases").json["cases"][0]
    assert "photo_path" not in case
    assert case["photo_url"].startswith("/api/photo/")
    assert client.get(case["photo_url"]).status_code == 200


def test_sighting_offline_nlp_and_unknown_case(client):
    r = client.post("/api/sighting", json={"raw_text": "Boy seen near Assi Ghat, Varanasi yesterday 5pm"})
    assert r.status_code == 201
    nlp = r.json["nlp"]
    assert nlp["engine"] == "offline"
    assert "Assi Ghat" in nlp["location"] and nlp["latitude"] is not None
    assert client.post("/api/sighting", json={"raw_text": "x", "case_id": "nope"}).status_code == 404
    assert client.post("/api/sighting", json={"raw_text": "  "}).status_code == 400


def test_bad_query_params_do_not_500(client):
    assert client.get("/api/sightings?limit=abc").status_code == 200
    assert client.get("/api/matches?limit=-5").status_code == 200
    assert client.post("/api/match", json={"case_id": None}).status_code == 400


def test_match_flow_dedupes_and_persists_review(client):
    cid = _register(client)
    r = client.post("/api/sighting", data={"raw_text": "Seen near Godowlia, Varanasi",
                                           "case_id": cid, "photo": (_jpg(), "s.jpg")},
                    content_type="multipart/form-data")
    assert r.status_code == 201
    for _ in range(3):  # re-running must not create duplicate rows
        assert client.post("/api/match", json={"case_id": cid}).status_code == 200
    matches = client.get(f"/api/matches?case_id={cid}").json["matches"]
    assert len(matches) == 1
    m = matches[0]
    assert m["reference_photo_url"] and m["sighting_photo_url"]
    assert client.patch(f"/api/matches/{m['id']}", json={"status": "flagged"}).status_code == 200
    assert client.get(f"/api/matches?case_id={cid}").json["matches"][0]["status"] == "flagged"
    assert client.patch(f"/api/matches/{m['id']}", json={"status": "bogus"}).status_code == 400


def test_case_status_update(client):
    cid = _register(client, photo=False)
    assert client.patch(f"/api/cases/{cid}", json={"status": "found"}).json["case"]["status"] == "found"
    assert client.get("/api/cases?status=open").json["total"] == 0


def test_map_returns_full_html_document(client):
    client.post("/api/sighting", json={"raw_text": "Seen at Sarnath"})
    r = client.get("/api/map")
    assert r.status_code == 200
    assert r.data.lstrip().startswith(b"<!DOCTYPE html>")
    assert client.get("/api/map?fmt=json").json["total"] == 1


def test_photo_traversal_blocked(client):
    assert client.get("/api/photo/..%2F..%2Fapp.py").status_code == 404
