import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend to path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_nearest_basic():
    response = client.get("/nearest?lat=12.9716&lng=77.5946&type=hospital")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "name" in data[0]
        assert "distance_km" in data[0]

def test_nearest_radius():
    response = client.get("/nearest?lat=12.9716&lng=77.5946&type=police&radius_km=10")
    assert response.status_code == 200

def test_nearest_limit():
    response = client.get("/nearest?lat=12.9716&lng=77.5946&limit=5")
    assert response.status_code == 200
    assert len(response.json()) <= 5

def test_nearest_invalid_coords():
    response = client.get("/nearest?lat=invalid&lng=77.5946")
    assert response.status_code == 422

def test_nearest_fallback_trigger():
    # Coordinates in a remote area likely to have < 3 results in DB
    response = client.get("/nearest?lat=0.0&lng=0.0&radius_km=1")
    assert response.status_code == 200

def test_nearest_type_filter():
    response = client.get("/nearest?lat=12.9716&lng=77.5946&type=fuel")
    assert response.status_code == 200
    for poi in response.json():
        assert poi["type"] == "fuel"
