import axios from 'axios';
import { queryLocalPOIs, POI } from './db';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function withFallback<T>(apiFunc: () => Promise<T>, fallbackFunc: () => Promise<T>): Promise<T> {
  try {
    if (!navigator.onLine) {
      return await fallbackFunc();
    }
    return await apiFunc();
  } catch (error) {
    console.error("API call failed, falling back to local storage:", error);
    return await fallbackFunc();
  }
}

export async function fetchNearest(lat: number, lng: number, type: string, radiusKm: number = 5, limit: number = 5): Promise<POI[]> {
  return withFallback(
    async () => {
      const res = await axios.get(`${API_URL}/nearest`, {
        params: { lat, lng, type, radius_km: radiusKm, limit },
        timeout: 3000
      });
      return res.data.results;
    },
    async () => {
      return await queryLocalPOIs(lat, lng, type, radiusKm);
    }
  );
}

export async function triggerSOS(
  lat: number,
  lng: number,
  contacts: string[]
): Promise<{
  sms_body: string;
  offline?: boolean;
  nearest_hospital?: unknown;
  nearest_police?: unknown;
  nearest_ambulance?: unknown;
}> {
  return withFallback(
    async () => {
      const res = await axios.post(`${API_URL}/sos`, { lat, lng, contacts }, { timeout: 4000 });
      return res.data;
    },
    async () => {
      const nearestHospitals = await queryLocalPOIs(lat, lng, 'hospital', 20);
      const hospitalInfo = nearestHospitals.length > 0 ? ` Nearest hospital: ${nearestHospitals[0].name} (${nearestHospitals[0].phone}).` : '';
      const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
      
      return {
        sms_body: `EMERGENCY! I need help at ${mapsLink}.${hospitalInfo} Please send help.`,
        offline: true
      };
    }
  );
}

export async function cacheRegion(min_lat: number, min_lng: number, max_lat: number, max_lng: number): Promise<POI[]> {
  const res = await axios.post(`${API_URL}/cache-region`, { min_lat, min_lng, max_lat, max_lng });
  return res.data.pois || res.data;
}
