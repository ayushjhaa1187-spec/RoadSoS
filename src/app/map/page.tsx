"use client";

import { useStore } from "@/store/useStore";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading Map...</div>,
});

function MapContent() {
  const { userLocation, emergencyLocation } = useStore();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || undefined;
  const mode = searchParams.get("mode") || undefined;

  const lat = emergencyLocation.lat || userLocation.lat;
  const lng = emergencyLocation.lng || userLocation.lng;

  if (!lat || !lng) {
    return <div className="flex items-center justify-center h-full">Waiting for location...</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      {mode === 'reporting' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-600 text-black px-4 py-2 rounded-full font-bold text-xs shadow-lg animate-bounce">
              TAP MAP TO SET ACCIDENT LOCATION
          </div>
      )}
      <MapComponent lat={lat} lng={lng} initialType={type} isReportingMode={mode === 'reporting'} />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <MapContent />
    </Suspense>
  );
}
