"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hospital, ShieldAlert, Ambulance, Truck, Wrench, CarFront, Phone, MapPin, CheckSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { queryLocalPOIs, cachePOIs } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const API_URL = "http://localhost:8000/api";

export default function Home() {
  const { userLocation, emergencyLocation, isDemoMode, isLocationManuallySet, setUserLocation, setLocationError, toggleDemoMode, resetEmergencyLocation } = useStore();
  const [loadingSOS, setLoadingSOS] = useState(false);
  const [emergencyNums, setEmergencyNumbers] = useState<any>(null);
  const [address, setAddress] = useState<string>("Acquiring location...");
  const [showChecklist, setShowChecklist] = useState(false);
  const router = useRouter();

  const handleAction = (type: string) => {
    router.push(`/map?type=${type}`);
  };

  const fetchEmergencyNumbers = async () => {
    try {
      const res = await axios.get(`${API_URL}/emergency-numbers?country=India`);
      setEmergencyNumbers(res.data);
    } catch (e) {
      setEmergencyNumbers({ name: "National Emergency", phone: "112" });
    }
  };

  useEffect(() => {
    const fetchLocality = async () => {
      if (emergencyLocation.lat && emergencyLocation.lng) {
        try {
          const res = await axios.get(`${API_URL}/locality?lat=${emergencyLocation.lat}&lng=${emergencyLocation.lng}`);
          setAddress(res.data.locality);
        } catch (e) {
          setAddress(`${emergencyLocation.lat.toFixed(4)}, ${emergencyLocation.lng.toFixed(4)}`);
        }
      }
    };
    fetchLocality();
  }, [emergencyLocation.lat, emergencyLocation.lng]);

  useEffect(() => {
    if (!isDemoMode && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation(pos.coords.latitude, pos.coords.longitude),
        (err) => {
          setLocationError(err.message);
          toast.error("Geolocation failed. Using manual fallback.");
        }
      );
    }
  }, [isDemoMode, setUserLocation, setLocationError]);

  const handleSOS = async () => {
    if (!emergencyLocation.lat || !emergencyLocation.lng) {
      toast.error("Location not available. Please enable GPS.");
      return;
    }
    
    setLoadingSOS(true);
    let smsBody = "";
    let ambulancePhone = "112";

    try {
      if (navigator.onLine) {
        const res = await axios.post(`${API_URL}/sos`, {
          lat: emergencyLocation.lat,
          lng: emergencyLocation.lng,
          user_phone: "Unknown",
          emergency_contacts: []
        }, { timeout: 4000 });
        smsBody = res.data.sms_body;
        if (res.data.nearest_ambulance?.phone) {
          ambulancePhone = res.data.nearest_ambulance.phone;
        }
      } else {
        throw new Error("Offline");
      }
    } catch (error: any) {
      const nearestHospitals = await queryLocalPOIs(emergencyLocation.lat, emergencyLocation.lng, "hospital", 20);
      const mapsLink = `https://www.google.com/maps?q=${emergencyLocation.lat},${emergencyLocation.lng}`;
      smsBody = nearestHospitals.length > 0 ? `Emergency! I need help at: ${mapsLink}. Nearest hospital: ${nearestHospitals[0].name}.` : `Emergency! I need help at: ${mapsLink}. Send ambulance.`;
      toast.info("Backend unreachable. Used offline cache for SOS payload.");
    } finally {
      setLoadingSOS(false);
      setShowChecklist(true);
      if (typeof window !== "undefined") {
        window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`;
        setTimeout(() => {
          window.location.href = `tel:${ambulancePhone}`;
        }, 1500);
      }
    }
  };

  return (
    <div className="flex flex-col items-center pt-8 px-4 h-full relative">
      <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
        <div className="flex items-center space-x-2">
            <label className="text-[10px] uppercase tracking-tighter text-muted-foreground" htmlFor="demo-toggle">Demo</label>
            <input id="demo-toggle" type="checkbox" checked={isDemoMode} onChange={toggleDemoMode} aria-label="Toggle Demo Mode (Chennai)" className="w-3 h-3" />
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-[10px] flex items-center gap-1 text-muted-foreground hover:text-white" onClick={() => router.push('/map?mode=reporting')}>
            <MapPin size={14} /> {isLocationManuallySet ? "LOC SET" : "SET LOC"}
        </Button>
        {isLocationManuallySet && (
            <Button variant="ghost" size="sm" className="h-4 text-[8px] text-red-400 hover:text-red-300 p-0" onClick={resetEmergencyLocation}>
                RESET TO GPS
            </Button>
        )}
      </div>

      <div className="w-full text-center mb-12 px-8">
        <h1 className="text-xl font-bold mb-2">RoadSoS</h1>
        <p className={`text-[10px] line-clamp-2 uppercase tracking-wide ${isLocationManuallySet ? "text-yellow-500 font-bold" : "text-muted-foreground"}`}>
          {address}
        </p>
      </div>

      {!showChecklist ? (
        <button
            onClick={handleSOS}
            disabled={loadingSOS}
            className="w-64 h-64 rounded-full bg-red-600 shadow-[0_0_60px_rgba(220,38,38,0.5)] flex items-center justify-center transition-transform active:scale-95 disabled:opacity-70 disabled:scale-100"
            aria-label="SOS Emergency Button"
        >
            <span className="text-white text-5xl font-black tracking-widest uppercase">
            {loadingSOS ? "..." : "SOS"}
            </span>
        </button>
      ) : (
        <Card className="w-full max-w-sm bg-red-950/20 border-red-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-red-400">🚨 ACTION CHECKLIST</CardTitle>
                <X className="h-4 w-4 cursor-pointer" onClick={() => setShowChecklist(false)} />
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                <div className="flex gap-2 text-xs items-start">
                    <CheckSquare size={14} className="mt-0.5 text-green-500 shrink-0" />
                    <span><b>Stay Calm:</b> Deep breaths. Your safety is first.</span>
                </div>
                <div className="flex gap-2 text-xs items-start">
                    <CheckSquare size={14} className="mt-0.5 text-green-500 shrink-0" />
                    <span><b>Apply Pressure:</b> Use a clean cloth if bleeding.</span>
                </div>
                <div className="flex gap-2 text-xs items-start">
                    <CheckSquare size={14} className="mt-0.5 text-green-500 shrink-0" />
                    <span><b>Don't Move:</b> Unless there is a fire or explosion risk.</span>
                </div>
                <div className="flex gap-2 text-xs items-start">
                    <CheckSquare size={14} className="mt-0.5 text-green-500 shrink-0" />
                    <span><b>Keep Warm:</b> Cover victim with a coat/blanket.</span>
                </div>
                <Button className="w-full h-8 text-[10px] mt-2 bg-green-700 hover:bg-green-600" onClick={() => setShowChecklist(false)}>
                    I'M HELPING - HIDE
                </Button>
            </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 mt-12 w-full max-w-md">
        <Card className="bg-card/50 cursor-pointer active:bg-card" role="button" onClick={() => handleAction("hospital")}>
          <CardContent className="p-3 flex flex-col items-center">
            <Hospital className="text-red-400 mb-1" size={24} />
            <span className="font-semibold text-[10px]">Hospital</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 cursor-pointer active:bg-card" role="button" onClick={() => handleAction("police")}>
          <CardContent className="p-3 flex flex-col items-center">
            <ShieldAlert className="text-blue-400 mb-1" size={24} />
            <span className="font-semibold text-[10px]">Police</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 cursor-pointer active:bg-card" role="button" onClick={() => handleAction("ambulance")}>
          <CardContent className="p-3 flex flex-col items-center">
            <Ambulance className="text-green-400 mb-1" size={24} />
            <span className="font-semibold text-[10px]">Ambulance</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 cursor-pointer active:bg-card" role="button" onClick={() => handleAction("towing")}>
          <CardContent className="p-3 flex flex-col items-center">
            <Truck className="text-yellow-400 mb-1" size={24} />
            <span className="font-semibold text-[10px]">Towing</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 cursor-pointer active:bg-card" role="button" onClick={() => handleAction("puncture_shop")}>
          <CardContent className="p-3 flex flex-col items-center">
            <Wrench className="text-orange-400 mb-1" size={24} />
            <span className="font-semibold text-[10px]">Puncture</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 cursor-pointer active:bg-card" role="button" onClick={() => handleAction("showroom")}>
          <CardContent className="p-3 flex flex-col items-center">
            <CarFront className="text-purple-400 mb-1" size={24} />
            <span className="font-semibold text-[10px]">Showroom</span>
          </CardContent>
        </Card>
        
        <Dialog>
          <DialogTrigger asChild>
            <Card className="bg-card/50 cursor-pointer active:bg-card col-span-3" role="button" onClick={fetchEmergencyNumbers}>
              <CardContent className="p-3 flex items-center justify-center gap-4">
                <Phone className="text-white" size={20} />
                <span className="font-bold text-xs uppercase tracking-wider">National Emergency Numbers</span>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Emergency Contacts</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {emergencyNums ? (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-bold text-lg mb-2">{emergencyNums.name}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{emergencyNums.phone}</p>
                  <Button className="w-full mt-4 bg-red-600 hover:bg-red-700" onClick={() => window.location.href = `tel:112`}>
                    Call 112 Now
                  </Button>
                </div>
              ) : (
                <p>Loading numbers...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
