import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface POI {
  id?: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  distance_km?: number;
}

interface RoadSoSDBSchema extends DBSchema {
  poi: {
    key: number;
    value: POI;
    indexes: {
      'by-type': string;
      'by-lat-lng': [number, number];
    };
  };
}

let dbPromise: Promise<IDBPDatabase<RoadSoSDBSchema>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<RoadSoSDBSchema>('roadsos-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('poi')) {
        const poiStore = db.createObjectStore('poi', { keyPath: 'id', autoIncrement: true });
        poiStore.createIndex('by-type', 'type');
        poiStore.createIndex('by-lat-lng', ['lat', 'lng']);
      }
    },
  });
}

// Client-side Haversine calculation
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function savePois(pois: POI[]): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction('poi', 'readwrite');
  const store = tx.objectStore('poi');
  
  // Clear old POIs to avoid bloat
  await store.clear();
  
  for (const poi of pois) {
    await store.add(poi);
  }
  
  await tx.done;
  localStorage.setItem('roadsos_cache_time', new Date().toISOString());
}

export async function queryNearest(lat: number, lng: number, type?: string, radius_km: number = 5, limit: number = 10): Promise<POI[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  
  let allPois: POI[] = [];
  if (type) {
    allPois = await db.getAllFromIndex('poi', 'by-type', type);
  } else {
    allPois = await db.getAll('poi');
  }

  const results = allPois
    .map((poi) => {
      const distance = haversine(lat, lng, poi.lat, poi.lng);
      return { ...poi, distance_km: parseFloat(distance.toFixed(3)) };
    })
    .filter((poi) => poi.distance_km <= radius_km)
    .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
    .slice(0, limit);

  return results;
}

export function getCacheAgeMinutes(): number | null {
  if (typeof window === 'undefined') return null;
  const cachedAt = localStorage.getItem('roadsos_cache_time');
  if (!cachedAt) return null;
  
  const diffMs = new Date().getTime() - new Date(cachedAt).getTime();
  return Math.floor(diffMs / 60000);
}
