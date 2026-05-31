from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from models.schemas import CacheRegionRequest
from routers.nearest import get_db

router = APIRouter()

@router.post("/cache-region")
def cache_region(request: CacheRegionRequest, db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.cursor()
        # Simple bounding box for the region
        lat_delta = request.radius_km / 111.0
        lng_delta = request.radius_km / 111.0 # Approximate
        
        cursor.execute('''
            SELECT * FROM poi 
            WHERE lat BETWEEN ? AND ? 
            AND lng BETWEEN ? AND ?
        ''', (request.lat - lat_delta, request.lat + lat_delta, request.lng - lng_delta, request.lng + lng_delta))
        
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error in cache_region: {e}")
        raise HTTPException(status_code=500, detail="Internal server error in region caching")
