"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/store/useStore";
import { cachePOIs } from "@/lib/db";
import { toast } from "sonner";
import axios from "axios";
import { DownloadCloud, CheckCircle, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function OfflinePage() {
  const { emergencyLocation } = useStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  const getCacheAgeMinutes = () => {
    const cachedAt = localStorage.getItem('roadsos_cache_time');
    if (!cachedAt) return null;
    const diff = new Date().getTime() - new Date(cachedAt).getTime();
    return Math.floor(diff / 60000);
  };

  useEffect(() => {
    setCacheAge(getCacheAgeMinutes());
    
    const initCache = async () => {
        const age = getCacheAgeMinutes();
        if (age === null && emergencyLocation.lat && navigator.onLine) {
            handleDownloadRegion();
        }
    };
    initCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergencyLocation.lat]);

  const handleDownloadRegion = async () => {
    if (!emergencyLocation.lat || !emergencyLocation.lng) {
      toast.error("Location required to cache region.");
      return;
    }

    setIsDownloading(true);
    try {
      const minLat = emergencyLocation.lat - 0.18;
      const maxLat = emergencyLocation.lat + 0.18;
      const minLng = emergencyLocation.lng - 0.18;
      const maxLng = emergencyLocation.lng + 0.18;

      const res = await axios.post(`${API_URL}/cache-region`, {
        min_lat: minLat,
        min_lng: minLng,
        max_lat: maxLat,
        max_lng: maxLng
      });
      
      const poisToCache = res.data.pois || res.data;
      await cachePOIs(poisToCache);
      localStorage.setItem('roadsos_cache_time', new Date().toISOString());
      localStorage.setItem('roadsos_precached', 'true');
      setCacheAge(0);
      toast.success(`Cached ${poisToCache.length} POIs for offline use.`);
    } catch {
      toast.error("Failed to download offline data.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Offline Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="text-green-500" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cacheAge !== null ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock size={16} /> Data cached {cacheAge} minutes ago. You are protected offline.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-yellow-500">
              No offline data. Please download a region.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache Current District</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download all emergency contacts within a 20 km radius of your current location to your device.
          </p>
          <Button 
            className="w-full flex items-center gap-2" 
            onClick={handleDownloadRegion}
            disabled={isDownloading || !emergencyLocation.lat}
          >
            <DownloadCloud size={18} />
            {isDownloading ? "Downloading..." : "Pre-download this district"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
