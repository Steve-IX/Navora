import { useEffect, useState } from 'react';
import { MapView } from './components/map/MapView';
import { LayerControl } from './components/map/LayerControl';
import { SearchBar } from './components/search/SearchBar';
import { RoutePlanner } from './components/routing/RoutePlanner';
import { GPSIndicator } from './components/location/GPSIndicator';
import { useMapStore } from './stores/mapStore';
import { authService } from './services/api/auth.service';
import { Coordinates } from '@shared/types/geocoding';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

function App() {
  const [isReady, setIsReady] = useState(false);
  const { addMarker } = useMapStore();

  useEffect(() => {
    // In demo mode, skip authentication
    if (IS_DEMO_MODE) {
      setIsReady(true);
      return;
    }

    // Initialize guest token if not authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      authService
        .createGuestToken()
        .then(() => setIsReady(true))
        .catch((error) => {
          console.error('Failed to create guest token:', error);
          // Still allow app to work in demo mode if auth fails
          setIsReady(true);
        });
    } else {
      setIsReady(true);
    }
  }, []);

  const handleMapClick = (coordinates: Coordinates) => {
    // Add a marker when clicking on the map
    const markerId = `marker-${Date.now()}`;
    addMarker({
      id: markerId,
      coordinates,
      title: `Marker at ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
      color: '#3b82f6',
    });
  };

  if (!isReady) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MapView onMapClick={handleMapClick}>
        <LayerControl />
        <SearchBar />
        <RoutePlanner />
        <GPSIndicator />
      </MapView>
    </div>
  );
}

export default App;

