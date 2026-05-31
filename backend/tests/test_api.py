import pytest
from models import Poi
from sqlalchemy import text


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_nearest_empty(client):
    response = client.get("/api/nearest?lat=13.08&lng=80.27&type=hospital")
    assert response.status_code == 200
    data = response.json()
    # nearest returns a list directly
    assert isinstance(data, list)


def test_sos_basic(client, db_session):
    # Insert a mock hospital
    poi = Poi(id="test_hosp", name="Test Hospital", type="hospital", lat=13.08, lng=80.27, phone="1234567890")
    db_session.add(poi)
    db_session.commit()
    db_session.refresh(poi)
    db_session.execute(text(f"INSERT INTO poi_rtree (id, min_lat, max_lat, min_lng, max_lng) VALUES ({poi.rowid}, 13.08, 13.08, 80.27, 80.27)"))
    db_session.commit()
    response = client.post("/api/sos", json={"lat": 13.08, "lng": 80.27, "contacts": []})
    assert response.status_code == 200
    data = response.json()
    assert "sms_body" in data
    assert "maps" in data["sms_body"]


def test_cache_region(client, db_session):
    response = client.post("/api/cache-region", json={
        "min_lat": 13.0, "min_lng": 80.2, "max_lat": 13.1, "max_lng": 80.3
    })
    assert response.status_code == 200
    assert "pois" in response.json()


def test_tts(client):
    response = client.post("/api/tts", json={"text": "Hello world", "lang": "en"})
    if response.status_code == 200:
        assert response.headers["content-type"] == "audio/mpeg"
