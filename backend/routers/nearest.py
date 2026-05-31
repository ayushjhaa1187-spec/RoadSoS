from fastapi import APIRouter, Query, Depends, HTTPException
import sqlite3
import os
import math
from typing import List, Optional
from models.schemas import POIResponse
from services.geo import haversine
from services.places_fallback import fetch_overpass_fallback

router = APIRouter()
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _get_db_path():
    return os.getenv("DATABASE_PATH", os.path.join(_BACKEND_DIR, "emergency_data.db"))

def get_db():
    conn = sqlite3.connect(_get_db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@router.get("/nearest", response_model=List[POIResponse])
def get_nearest(
    lat: float,
    lng: float,
    type: Optional[str] = None,
    radius_km: float = 5.0,
    limit: int = 10,
    db: sqlite3.Connection = Depends(get_db)
):
    try:
        cursor = db.cursor()
        
        # Basic bounding box to narrow down results before haversine
        # 1 degree lat ~ 111km. 1 degree lng ~ 111km * cos(lat)
        lat_delta = radius_km / 111.0
        lng_delta = radius_km / (111.0 * abs(math.cos(math.radians(lat)))) if abs(math.cos(math.radians(lat))) > 0.01 else radius_km/111.0

        query = "SELECT * FROM poi WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?"
        params = [lat - lat_delta, lat + lat_delta, lng - lng_delta, lng + lng_delta]
        
        if type:
            query += " AND type = ?"
            params.append(type)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            d = haversine(lat, lng, row['lat'], row['lng'])
            if d <= radius_km:
                results.append({**dict(row), "distance_km": round(d, 3)})
        
        results.sort(key=lambda x: x["distance_km"])
        results = results[:limit]
        
        # Fallback if fewer than 3 results
        if len(results) < 3:
            fallback_results = fetch_overpass_fallback(lat, lng, radius_km, type)
            for fr in fallback_results:
                if any(r['name'] == fr['name'] and round(r['lat'],4) == round(fr['lat'],4) for r in results):
                    continue
                
                d = haversine(lat, lng, fr['lat'], fr['lng'])
                if d <= radius_km:
                    fr['distance_km'] = round(d, 3)
                    results.append(fr)
            
            results.sort(key=lambda x: x["distance_km"])
            results = results[:limit]

        return results
    except Exception as e:
        print(f"Error in get_nearest: {e}")
        raise HTTPException(status_code=500, detail="Internal server error in nearest POI lookup")
