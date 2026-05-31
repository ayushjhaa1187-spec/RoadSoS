from fastapi import APIRouter, HTTPException
import sqlite3
import os
import math
import logging
import datetime
from models.schemas import SOSRequest, SOSResponse, POIResponse

router = APIRouter()
logger = logging.getLogger(__name__)

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _get_db_path():
    return os.getenv("DATABASE_PATH", os.path.join(_BACKEND_DIR, "emergency_data.db"))

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat/2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def query_nearest_sqlite(lat, lng, poi_type, radius_km, limit):
    db_path = _get_db_path()
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        lat_delta = radius_km / 111.0
        cos_lat = abs(math.cos(math.radians(lat)))
        lng_delta = radius_km / (111.0 * cos_lat) if cos_lat > 0.01 else radius_km / 111.0

        cursor.execute(
            "SELECT * FROM poi WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? AND type = ?",
            [lat - lat_delta, lat + lat_delta, lng - lng_delta, lng + lng_delta, poi_type]
        )
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            d = haversine(lat, lng, row['lat'], row['lng'])
            if d <= radius_km:
                results.append({**dict(row), "distance_km": round(d, 3)})
        results.sort(key=lambda x: x["distance_km"])
        return results[:limit]
    except Exception as e:
        logger.warning(f"SOS nearest query error: {e}")
        return []


@router.post("/sos", response_model=SOSResponse)
def trigger_sos(request: SOSRequest):
    try:
        logger.info(f"SOS Triggered at {datetime.datetime.now(datetime.timezone.utc)}")

        hospitals = query_nearest_sqlite(request.lat, request.lng, "hospital", 20, 1)
        police = query_nearest_sqlite(request.lat, request.lng, "police", 20, 1)
        ambulances = query_nearest_sqlite(request.lat, request.lng, "ambulance", 20, 1)

        h = hospitals[0] if hospitals else {"name": "Unknown", "distance_km": "?", "phone": "112"}
        p = police[0] if police else {"name": "Unknown", "distance_km": "?", "phone": "100"}
        a = ambulances[0] if ambulances else {"name": "Unknown", "distance_km": "?", "phone": "108"}

        maps_link = f"https://www.google.com/maps?q={request.lat},{request.lng}"
        sms_body = (
            f"Emergency: I am at {maps_link}. "
            f"Nearest hospital: {h['name']} ({h['distance_km']}km, tel:{h['phone']}). "
            f"Police: {p['name']} ({p['distance_km']}km, tel:{p['phone']}). "
            f"Ambulance: {a['name']} ({a['distance_km']}km, tel:{a['phone']}). "
            f"Please send help."
        )

        return SOSResponse(
            sms_body=sms_body,
            nearest_hospital=POIResponse(**h) if hospitals else None,
            nearest_police=POIResponse(**p) if police else None,
            nearest_ambulance=POIResponse(**a) if ambulances else None
        )
    except Exception as e:
        logger.error(f"SOS error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
