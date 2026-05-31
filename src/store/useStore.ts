import { create } from 'zustand';

interface Location {
  lat: number | null;
  lng: number | null;
  error: string | null;
}

interface AppState {
  userLocation: Location;
  emergencyLocation: Location;
  isDemoMode: boolean;
  isLocationManuallySet: boolean;
  setUserLocation: (lat: number, lng: number) => void;
  setEmergencyLocation: (lat: number, lng: number) => void;
  setLocationError: (error: string) => void;
  toggleDemoMode: () => void;
  resetEmergencyLocation: () => void;
}

const CHENNAI_COORDS = { lat: 13.0827, lng: 80.2707 };

export const useStore = create<AppState>((set) => ({
  userLocation: { lat: null, lng: null, error: null },
  emergencyLocation: { lat: null, lng: null, error: null },
  isDemoMode: false,
  isLocationManuallySet: false,
  setUserLocation: (lat, lng) => set((state) => ({ 
    userLocation: { lat, lng, error: null },
    emergencyLocation: state.isLocationManuallySet ? state.emergencyLocation : { lat, lng, error: null }
  })),
  setEmergencyLocation: (lat, lng) => set({ 
    emergencyLocation: { lat, lng, error: null },
    isLocationManuallySet: true 
  }),
  setLocationError: (error) => set((state) => ({ userLocation: { ...state.userLocation, error } })),
  toggleDemoMode: () => set((state) => {
    const newDemoMode = !state.isDemoMode;
    if (newDemoMode) {
      return { 
        isDemoMode: true, 
        userLocation: { lat: CHENNAI_COORDS.lat, lng: CHENNAI_COORDS.lng, error: null },
        emergencyLocation: { lat: CHENNAI_COORDS.lat, lng: CHENNAI_COORDS.lng, error: null },
        isLocationManuallySet: false
      };
    }
    return { 
        isDemoMode: false, 
        userLocation: { lat: null, lng: null, error: null },
        emergencyLocation: { lat: null, lng: null, error: null },
        isLocationManuallySet: false
    };
  }),
  resetEmergencyLocation: () => set((state) => ({
    emergencyLocation: { ...state.userLocation },
    isLocationManuallySet: false
  }))
}));
