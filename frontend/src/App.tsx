import { useEffect, useState } from 'react';
import { MapView } from './components/map/MapView';
import { LayerControl } from './components/map/LayerControl';
import { SearchBar } from './components/search/SearchBar';
import { RoutePlanner } from './components/routing/RoutePlanner';
import { GPSIndicator } from './components/location/GPSIndicator';
import { SidePanel } from './components/layout/SidePanel';
import { PlaceSearch, PlaceDetails, NearbyPlaces } from './components/places';
import { MeasurementTool } from './components/tools';
import { useMapStore } from './stores/mapStore';
import { usePlacesStore } from './stores/placesStore';
import { useUIStore } from './stores/uiStore';
import { authService } from './services/api/auth.service';
import { locationService } from './services/locationService';
import { shareService } from './services/share.service';
import { useRouteStore } from './stores/routeStore';
import { Coordinates } from '@shared/types/geocoding';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

function App() {
  const [isReady, setIsReady] = useState(false);
  const { addMarker, setCenter, setZoom } = useMapStore();
  const { selectedPlace } = usePlacesStore();
  const { sidePanelOpen, sidePanelContent, setSidePanelOpen, setSidePanelContent } = useUIStore();
  const { addWaypoint, setProfile } = useRouteStore();
  const [showMeasurementTool, setShowMeasurementTool] = useState(false);

  const initializeLocation = async () => {
    try {
      const location = await locationService.getCurrentPosition();
      setCenter(location.coordinates);
      setZoom(12); // Zoom in when we have a specific location
    } catch (error) {
      console.warn('Failed to detect location:', error);
      // Keep default world center (0, 0) with zoom level 2
    }
  };

  const handleSharedContent = () => {
    // Check for shared location
    const sharedLocation = shareService.parseLocationUrl();
    if (sharedLocation) {
      setCenter(sharedLocation.coordinates);
      setZoom(14);
      addMarker({
        id: 'shared-location',
        coordinates: sharedLocation.coordinates,
        title: sharedLocation.name || 'Shared Location',
        color: '#3b82f6',
      });
      return;
    }

    // Check for shared route
    const sharedRoute = shareService.parseRouteUrl();
    if (sharedRoute) {
      sharedRoute.waypoints.forEach(wp => addWaypoint(wp));
      setProfile(sharedRoute.profile as any);
      // Center on first waypoint
      if (sharedRoute.waypoints.length > 0) {
        setCenter(sharedRoute.waypoints[0].coordinates);
        setZoom(12);
      }
    }
  };

  useEffect(() => {
    // In demo mode, skip authentication
    if (IS_DEMO_MODE) {
      setIsReady(true);
      initializeLocation();
      handleSharedContent();
      return;
    }

    // Initialize guest token if not authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      authService
        .createGuestToken()
        .then(() => {
          setIsReady(true);
          initializeLocation();
          handleSharedContent();
        })
        .catch((error) => {
          console.error('Failed to create guest token:', error);
          // Still allow app to work if auth fails
          setIsReady(true);
          initializeLocation();
          handleSharedContent();
        });
    } else {
      setIsReady(true);
      initializeLocation();
      handleSharedContent();
    }
  }, [setCenter, setZoom]);

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
        
        {/* Floating Action Buttons */}
        <div className="absolute bottom-20 left-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => {
              setSidePanelContent('places');
            }}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Search places"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowMeasurementTool(!showMeasurementTool)}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Measurement tool"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        </div>

        {showMeasurementTool && (
          <MeasurementTool onClose={() => setShowMeasurementTool(false)} />
        )}
      </MapView>

      {/* Side Panel */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'places'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
        }}
        title={selectedPlace ? 'Place Details' : 'Places'}
        width="md"
      >
        {selectedPlace ? (
          <PlaceDetails
            place={selectedPlace}
            onClose={() => {
              usePlacesStore.getState().setSelectedPlace(null);
            }}
          />
        ) : (
          <div className="p-4 space-y-4">
            <PlaceSearch />
            <div className="border-t border-gray-200 pt-4">
              <NearbyPlaces />
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}

export default App;

