import pytest
import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DATABASE_PATH", "./test_emergency_data.db")

from main import app

client = TestClient(app)


def test_sos_payload():
    payload = {
        "lat": 12.9716,
        "lng": 77.5946,
        "user_phone": "+919876543210",
        "emergency_contacts": ["+919999999999"]
    }
    response = client.post("/sos", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "nearest_hospital" in data
    assert "nearest_police" in data
    assert "sms_body" in data
    assert "https://www.google.com/maps" in data["sms_body"]


def test_sos_missing_fields():
    payload = {"lat": 12.9716}
    response = client.post("/sos", json=payload)
    assert response.status_code == 422


def test_sos_invalid_coords():
    payload = {
        "lat": 1000,
        "lng": 77.5946,
        "user_phone": "123",
        "emergency_contacts": []
    }
    response = client.post("/sos", json=payload)
    assert response.status_code == 422


def test_sos_empty_contacts():
    payload = {
        "lat": 12.9716,
        "lng": 77.5946,
        "user_phone": "+919876543210",
        "emergency_contacts": []
    }
    response = client.post("/sos", json=payload)
    assert response.status_code == 200


def test_sos_sms_content():
    payload = {
        "lat": 12.9716,
        "lng": 77.5946,
        "user_phone": "1234567890",
        "emergency_contacts": ["9876543210"]
    }
    response = client.post("/sos", json=payload)
    assert response.status_code == 200
    sms_body = response.json()["sms_body"]
    assert "Emergency" in sms_body
    assert "12.9716" in sms_body
    assert "77.5946" in sms_body


def test_sos_hospital_presence():
    payload = {
        "lat": 12.9716,
        "lng": 77.5946,
        "user_phone": "1234567890",
        "emergency_contacts": []
    }
    response = client.post("/sos", json=payload)
    data = response.json()
    assert "nearest_hospital" in data
