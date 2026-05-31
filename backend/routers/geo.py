from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, haversine
from models.schemas import POIResponse, CacheRegionRequest
from models import Poi
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/cache-region")
def cache_region_endpoint(req: CacheRegionRequest, db: Session = Depends(get_db)):
    # Require bounding box fields
    if req.min_lat is None or req.min_lng is None or req.max_lat is None or req.max_lng is None:
        raise HTTPException(status_code=422, detail="min_lat, min_lng, max_lat, max_lng are required")

    try:
        res = db.execute(
            text(
                "SELECT id FROM poi_rtree WHERE min_lat >= :min_lat AND max_lat <= :max_lat "
                "AND min_lng >= :min_lng AND max_lng <= :max_lng"
            ),
            {"min_lat": req.min_lat, "max_lat": req.max_lat, "min_lng": req.min_lng, "max_lng": req.max_lng}
        ).fetchall()
        rowids = [r[0] for r in res]

        if not rowids:
            return {"pois": []}

        pois = db.query(Poi).filter(Poi.rowid.in_(rowids)).all()
        out = []
        for p in pois:
            out.append(POIResponse(
                id=p.id,
                name=p.name,
                type=p.type,
                lat=p.lat,
                lng=p.lng,
                phone=p.phone,
                address=p.address,
                distance_km=0  # Distance is not relevant for region caching
            ))
        return {"pois": out}
    except Exception as e:
        logger.error(f"Cache region error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
