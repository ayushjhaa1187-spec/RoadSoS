from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, query_nearest, haversine
from models.schemas import NearestResponse, POIResponse, CacheRegionRequest, CacheRegionResponse
from models import Poi
import overpy
import logging

router = APIRouter()
api = overpy.Overpass()
logger = logging.getLogger(__name__)

def fetch_overpass_pois(lat: float, lng: float, poi_type: str, radius_km: float, limit: int):
    tags = {
        "hospital": "['amenity'='hospital']",
        "police": "['amenity'='police']",
        "ambulance": "['emergency'='ambulance_station']",
        "fire_station": "['amenity'='fire_station']",
        "fuel": "['amenity'='fuel']"
    }
    if poi_type not in tags:
        return []
    
    radius_m = int(radius_km * 1000)
    query = f"""
    [out:json];
    node(around:{radius_m},{lat},{lng}){tags[poi_type]};
    out {limit};
    """
    try:
        result = api.query(query)
        pois = []
        for node in result.nodes:
            pois.append({
                "id": f"osm_{node.id}",
                "name": node.tags.get("name", "Unknown"),
                "type": poi_type,
                "lat": float(node.lat),
                "lng": float(node.lon),
                "phone": node.tags.get("phone") or node.tags.get("contact:phone"),
                "address": node.tags.get("addr:full"),
                "source": "overpass"
            })
        return pois
    except Exception as e:
        logger.error(f"Overpass error: {e}")
        return []

@router.get("/nearest", response_model=NearestResponse)
def get_nearest_endpoint(lat: float, lng: float, type: str, radius_km: float = 5.0, limit: int = 5, db: Session = Depends(get_db)):
    results = query_nearest(db, lat, lng, type, radius_km, limit)
    
    # Fallback to Overpass if few results
    if len(results) < 3 and type in ["hospital", "police", "ambulance"]:
        osm_pois = fetch_overpass_pois(lat, lng, type, radius_km, limit)
        for op in osm_pois:
            # Check if already in results
            if not any(r['id'] == op['id'] for r in results):
                # Optionally cache in DB
                try:
                    new_poi = Poi(
                        id=op['id'], name=op['name'], type=op['type'],
                        lat=op['lat'], lng=op['lng'], phone=op['phone'], source='overpass'
                    )
                    db.add(new_poi)
                    db.commit()
                    db.refresh(new_poi)
                    db.execute(text(f"INSERT INTO poi_rtree (id, min_lat, max_lat, min_lng, max_lng) VALUES ({new_poi.rowid}, {op['lat']}, {op['lat']}, {op['lng']}, {op['lng']})"))
                    db.commit()
                    
                    dist = haversine(lat, lng, op['lat'], op['lng'])
                    op['distance_km'] = round(dist, 3)
                    results.append(op)
                except Exception as e:
                    db.rollback()
                    logger.warning(f"Failed to cache OSM POI {op['id']}: {e}")
                    
        results.sort(key=lambda x: x["distance_km"])
        
    return {"results": results[:limit]}

@router.post("/cache-region", response_model=CacheRegionResponse)
def cache_region_endpoint(req: CacheRegionRequest, db: Session = Depends(get_db)):
    # Simple bounding box query
    # Using R-Tree for efficiency
    res = db.execute(text(f"SELECT id FROM poi_rtree WHERE min_lat>={req.min_lat} AND max_lat<={req.max_lat} AND min_lng>={req.min_lng} AND max_lng<={req.max_lng}")).fetchall()
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
            distance_km=0 # Distance is not relevant for region caching
        ))
    return {"pois": out}
