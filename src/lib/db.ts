import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface POI {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  phone?: string;
  address?: string;
  distance_km?: number;
}

export interface ChatMessage {
  id?: number;
  sessionId: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface MapTile {
  url: string;
  blob: Blob;
}

interface RoadSoSDB extends DBSchema {
  poi: {
    value: POI;
    key: string;
    indexes: { 'type': string, 'lat': number, 'lng': number };
  };
  chat_history: {
    value: ChatMessage;
    key: number;
    indexes: { 'sessionId': string, 'timestamp': number };
  };
  emergency_contacts: {
    value: EmergencyContact;
    key: string;
  };
  map_tiles: {
    value: MapTile;
    key: string;
  };
}

let dbPromise: Promise<IDBPDatabase<RoadSoSDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RoadSoSDB>('roadsos-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('poi')) {
          const poiStore = db.createObjectStore('poi', { keyPath: 'id' });
          poiStore.createIndex('type', 'type');
          poiStore.createIndex('lat', 'lat');
          poiStore.createIndex('lng', 'lng');
        }
        if (!db.objectStoreNames.contains('chat_history')) {
          const chatStore = db.createObjectStore('chat_history', { keyPath: 'id', autoIncrement: true });
          chatStore.createIndex('sessionId', 'sessionId');
          chatStore.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('emergency_contacts')) {
          db.createObjectStore('emergency_contacts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('map_tiles')) {
          db.createObjectStore('map_tiles', { keyPath: 'url' });
        }
      },
    });
  }
  return dbPromise;
}

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export async function cachePOIs(pois: POI[]) {
  const db = await getDB();
  const tx = db.transaction('poi', 'readwrite');
  pois.forEach(poi => tx.store.put(poi));
  await tx.done;
}

export async function queryLocalPOIs(lat: number, lng: number, type: string, radiusKm: number): Promise<POI[]> {
  const db = await getDB();
  const allPOIs = await db.getAllFromIndex('poi', 'type', type);
  
  const filtered = allPOIs
    .map(poi => ({
      ...poi,
      distance_km: getDistanceFromLatLonInKm(lat, lng, poi.lat, poi.lng)
    }))
    .filter(poi => poi.distance_km! <= radiusKm)
    .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

  return filtered.slice(0, 500); // max 500 items
}

export async function addChatMessage(msg: Omit<ChatMessage, 'id'>) {
  const db = await getDB();
  await db.add('chat_history', msg);
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('chat_history', 'sessionId', sessionId);
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveEmergencyContacts(contacts: EmergencyContact[]) {
  const db = await getDB();
  const tx = db.transaction('emergency_contacts', 'readwrite');
  contacts.forEach(contact => tx.store.put(contact));
  await tx.done;
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const db = await getDB();
  return await db.getAll('emergency_contacts');
}
