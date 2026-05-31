"use client";

import { Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import axios from "axios";
import { POI, queryNearest } from "@/lib/offlineDb";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Navigation as NavigationIcon, Phone, MapPin } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";

export default function MapComponent({ 
    lat, 
    lng, 
    initialType, 
    isReportingMode 
}: { 
    lat: number; 
    lng: number; 
    initialType?: string;
    isReportingMode?: boolean;
}) {
  const { setEmergencyLocation, userLocation } = useStore();
  const router = useRouter();
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [currentType, setCurrentType] = useState<string | undefined>(initialType);

  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        if (navigator.onLine) {
          const typeQuery = currentType ? `&type=${currentType}` : "";
          const res = await axios.get(`http://localhost:8000/api/nearest?lat=${lat}&lng=${lng}&radius_km=10${typeQuery}`, { timeout: 5000 });
          setPois(res.data);
        } else {
          throw new Error("Offline");
        }
      } catch (err) {
        const cachedPois = await queryNearest(lat, lng, currentType, 10, 50);
        setPois(cachedPois);
        if (navigator.onLine) {
          toast.error("Failed to fetch live map data. Using cache.");
        }
      }
    };
    fetchPOIs();
  }, [lat, lng, currentType]);

  const onMapClick = (e: any) => {
    if (isReportingMode && e.detail.latLng) {
        const newLat = e.detail.latLng.lat;
        const newLng = e.detail.latLng.lng;
        setEmergencyLocation(newLat, newLng);
        toast.success("Accident location updated!");
        router.push('/');
    }
  };

  const openNavigation = (poi: POI) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  return (
    <Map
      style={{ width: "100%", height: "100%" }}
      defaultCenter={{ lat, lng }}
      defaultZoom={15}
      gestureHandling={"greedy"}
      disableDefaultUI={false}
      onClick={onMapClick}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
    >
      {/* User's Actual GPS Location (Blue Pin) */}
      {userLocation.lat && userLocation.lng && (
          <Marker
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            title={"Your GPS Location"}
          />
      )}

      {/* Emergency Location (Big Red Marker if manually set) */}
      <Marker
        position={{ lat, lng }}
        label={"!"}
        title={"Emergency Location"}
      />

      {/* POI Markers */}
      {pois.map((poi, idx) => (
        <Marker
          key={poi.id || idx}
          position={{ lat: poi.lat, lng: poi.lng }}
          onClick={() => setSelectedPoi(poi)}
          opacity={0.7}
        />
      ))}

      {selectedPoi && (
        <InfoWindow
          position={{ lat: selectedPoi.lat, lng: selectedPoi.lng }}
          onCloseClick={() => setSelectedPoi(null)}
        >
          <div className="p-2 min-w-[200px] text-black">
            <h3 className="font-bold text-sm mb-1">{selectedPoi.name}</h3>
            <p className="text-xs text-gray-600 mb-2 uppercase">{selectedPoi.type}</p>
            <div className="flex flex-col gap-2">
              {selectedPoi.phone && (
                <Button size="sm" variant="outline" className="h-8 text-[10px] gap-1" onClick={() => window.location.href = `tel:${selectedPoi.phone}`}>
                  <Phone size={12} /> {selectedPoi.phone}
                </Button>
              )}
              <Button size="sm" className="h-8 text-[10px] gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => openNavigation(selectedPoi)}>
                <NavigationIcon size={12} /> Navigate Now
              </Button>
            </div>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}
