"use client";

import { useEffect, useState } from "react";
import { getCacheAgeMinutes } from "@/lib/offlineDb";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setIsOffline(!navigator.onLine);
      setCacheAge(getCacheAgeMinutes());
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-600 text-black text-xs font-semibold px-4 py-1 text-center flex justify-between items-center z-50 relative">
      <span>Offline mode — using cached data</span>
      {cacheAge !== null && <span>{cacheAge} mins old</span>}
    </div>
  );
}
