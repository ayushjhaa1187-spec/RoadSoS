from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import math

import os
DATABASE_PATH = os.getenv("DATABASE_PATH", "emergency_data.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS poi_rtree USING rtree(id, min_lat, max_lat, min_lng, max_lng);"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def query_nearest(db, lat, lng, type, radius_km, limit):
    from models import Poi
    # 1 deg lat ~= 111 km
    lat_diff = radius_km / 111.0
    lng_diff = radius_km / (111.0 * math.cos(math.radians(lat)))
    
    min_lat = lat - lat_diff
    max_lat = lat + lat_diff
    min_lng = lng - lng_diff
    max_lng = lng + lng_diff
    
    res = db.execute(text(f"SELECT id FROM poi_rtree WHERE min_lat>={min_lat} AND max_lat<={max_lat} AND min_lng>={min_lng} AND max_lng<={max_lng}")).fetchall()
    rowids = [r[0] for r in res]
    
    if not rowids:
        return []
        
    pois = db.query(Poi).filter(Poi.rowid.in_(rowids), Poi.type == type).all()
    
    results = []
    for poi in pois:
        dist = haversine(lat, lng, poi.lat, poi.lng)
        if dist <= radius_km:
            results.append({
                "id": poi.id,
                "name": poi.name,
                "type": poi.type,
                "lat": poi.lat,
                "lng": poi.lng,
                "phone": str(poi.phone) if poi.phone else None,
                "address": poi.address,
                "distance_km": dist
            })
            
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]
