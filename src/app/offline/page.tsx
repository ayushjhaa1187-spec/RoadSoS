"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/store/useStore";
import { savePois, getCacheAgeMinutes } from "@/lib/offlineDb";
import { toast } from "sonner";
import axios from "axios";
import { DownloadCloud, CheckCircle, Clock } from "lucide-react";

export default function OfflinePage() {
  const { location } = useStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  useEffect(() => {
    setCacheAge(getCacheAgeMinutes());
    
    // Auto-cache on first load logic (if cache is null and we are online)
    const initCache = async () => {
        const age = getCacheAgeMinutes();
        if (age === null && location.lat && navigator.onLine) {
            handleDownloadRegion();
        }
    };
    initCache();
  }, [location.lat]);

  const handleDownloadRegion = async () => {
    if (!location.lat || !location.lng) {
      toast.error("Location required to cache region.");
      return;
    }

    setIsDownloading(true);
    try {
      const res = await axios.post("http://localhost:8000/api/cache-region", {
        lat: location.lat,
        lng: location.lng,
        radius_km: 20
      });
      
      await savePois(res.data);
      setCacheAge(0);
      toast.success(`Cached ${res.data.length} POIs for offline use.`);
    } catch (err) {
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
            disabled={isDownloading || !location.lat}
          >
            <DownloadCloud size={18} />
            {isDownloading ? "Downloading..." : "Pre-download this district"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
