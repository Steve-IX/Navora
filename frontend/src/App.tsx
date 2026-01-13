import { useEffect, useState, useCallback } from 'react';
import { MapView } from './components/map/MapView';
import { LayerControl } from './components/map/LayerControl';
import { SearchBar } from './components/search/SearchBar';
import { RoutePlanner } from './components/routing/RoutePlanner';
import { GPSIndicator } from './components/location/GPSIndicator';
import { SidePanel, Header } from './components/layout';
import { PlaceSearch, PlaceDetails, NearbyPlaces } from './components/places';
import { MeasurementTool } from './components/tools';
import { FriendsPanel, UserProfile, SocialFeed } from './components/social';
import { GroupTripPlanner } from './components/trips';
import { useMapStore } from './stores/mapStore';
import { usePlacesStore } from './stores/placesStore';
import { useUIStore } from './stores/uiStore';
import { useAuthStore } from './stores/authStore';
import { locationService } from './services/locationService';
import { shareService } from './services/share.service';
import { geocodingService } from './services/api/geocoding.service';
import { websocketService } from './services/websocket.service';
import { useRouteStore } from './stores/routeStore';
import { useLocationShareStore } from './stores/locationShareStore';
import { useLocationStore } from './stores/locationStore';
import { Coordinates } from '@shared/types/geocoding';
import { Place } from '@shared/types/places';
import { getPlaceholderImage, getPlaceholderThumbnail } from './utils/placeholders';
import { ToastContainer } from './components/ui/Toast';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

function App() {
  const [isReady, setIsReady] = useState(false);
  const { setCenter, setZoom } = useMapStore();
  const { selectedPlace, setSelectedPlace } = usePlacesStore();
  const { sidePanelOpen, sidePanelContent, setSidePanelOpen, setSidePanelContent } = useUIStore();
  const { addWaypoint, setProfile } = useRouteStore();
  const { updateFriendLocation } = useLocationShareStore();
  const { currentLocation, isTracking } = useLocationStore();
  const { initializeAuth, isAuthenticated, token, isLoading: authLoading } = useAuthStore();
  const [showMeasurementTool, setShowMeasurementTool] = useState(false);
  const [isLoadingPoi, setIsLoadingPoi] = useState(false);

  const initializeLocation = async () => {
    try {
      const location = await locationService.getCurrentPosition();
      setCenter(location.coordinates);
      setZoom(12);
    } catch (error) {
      console.warn('Failed to detect location:', error);
    }
  };

  const handleSharedContent = () => {
    const sharedLocation = shareService.parseLocationUrl();
    if (sharedLocation) {
      setCenter(sharedLocation.coordinates);
      setZoom(14);
      // Show place details for shared location
      const place: Place = {
        id: 'shared-location',
        name: sharedLocation.name || 'Shared Location',
        coordinates: sharedLocation.coordinates,
        address: sharedLocation.address || `${sharedLocation.coordinates.latitude.toFixed(6)}, ${sharedLocation.coordinates.longitude.toFixed(6)}`,
        categoryIcon: '📍',
      };
      setSelectedPlace(place);
      setSidePanelContent('places');
      setSidePanelOpen(true);
      return;
    }

    const sharedRoute = shareService.parseRouteUrl();
    if (sharedRoute) {
      sharedRoute.waypoints.forEach(wp => addWaypoint(wp));
      setProfile(sharedRoute.profile as any);
      if (sharedRoute.waypoints.length > 0) {
        setCenter(sharedRoute.waypoints[0].coordinates);
        setZoom(12);
      }
    }
  };

  // Initialize authentication
  useEffect(() => {
    const init = async () => {
      if (IS_DEMO_MODE) {
        setIsReady(true);
        initializeLocation();
        handleSharedContent();
        return;
      }

      await initializeAuth();
      setIsReady(true);
      initializeLocation();
      handleSharedContent();
    };
    init();
  }, [initializeAuth]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (IS_DEMO_MODE || !token) {
      return;
    }

    if (isAuthenticated || token) {
      websocketService.connect(token);
      
      // Set up location update callback
      const unsubscribe = websocketService.onLocationUpdate((data) => {
        updateFriendLocation(data.userId, {
          userId: data.userId,
          coordinates: data.coordinates,
          timestamp: new Date(data.timestamp),
        });
      });

      return () => {
        unsubscribe();
        websocketService.disconnect();
      };
    }
  }, [token, isAuthenticated, updateFriendLocation]);

  // Send location updates via WebSocket when tracking
  useEffect(() => {
    if (isTracking && currentLocation && websocketService.isConnected()) {
      websocketService.sendLocationUpdate(currentLocation);
    }
  }, [currentLocation, isTracking]);

  // Handle regular map clicks - reverse geocode to get place info
  const handleMapClick = useCallback(async (coordinates: Coordinates) => {
    setIsLoadingPoi(true);
    
    try {
      // Reverse geocode to get place information
      const results = await geocodingService.reverseGeocode(coordinates);
      
      if (results && results.length > 0) {
        const result = results[0];
        const category = result.category || inferCategoryFromContext(result.context);
        const place: Place = {
          id: result.id || `location-${Date.now()}`,
          name: result.placeName.split(',')[0] || 'Selected Location',
          coordinates: result.coordinates,
          address: result.placeName,
          category,
          ...generatePlaceEnhancements({
            id: result.id,
            name: result.placeName.split(',')[0],
            coordinates: result.coordinates,
            category,
          } as Place),
        };
        
        setSelectedPlace(place);
        setSidePanelContent('places');
        setSidePanelOpen(true);
      } else {
        // Fallback: create a basic place for the coordinates
        const place: Place = {
          id: `location-${Date.now()}`,
          name: 'Selected Location',
          coordinates,
          address: `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
        };
        setSelectedPlace(place);
        setSidePanelContent('places');
        setSidePanelOpen(true);
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      // Fallback
      const place: Place = {
        id: `location-${Date.now()}`,
        name: 'Selected Location',
        coordinates,
        address: `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
      };
      setSelectedPlace(place);
      setSidePanelContent('places');
      setSidePanelOpen(true);
    } finally {
      setIsLoadingPoi(false);
    }
  }, [setSelectedPlace, setSidePanelContent, setSidePanelOpen]);

  // Handle POI click on the map (from labeled features)
  const handlePoiClick = useCallback(async (poi: { name: string; coordinates: Coordinates; category?: string }) => {
    setIsLoadingPoi(true);
    
    const place: Place = {
      id: `poi-${Date.now()}`,
      name: poi.name,
      coordinates: poi.coordinates,
      category: poi.category,
      address: `${poi.coordinates.latitude.toFixed(6)}, ${poi.coordinates.longitude.toFixed(6)}`,
      ...generatePlaceEnhancements({
        id: `poi-${Date.now()}`,
        name: poi.name,
        coordinates: poi.coordinates,
        category: poi.category,
      } as Place),
    };

    // Try to get address via reverse geocoding
    try {
      const results = await geocodingService.reverseGeocode(poi.coordinates);
      if (results && results.length > 0) {
        place.address = results[0].placeName;
      }
    } catch (error) {
      console.warn('Failed to get address:', error);
    }

    setSelectedPlace(place);
    setSidePanelContent('places');
    setSidePanelOpen(true);
    setIsLoadingPoi(false);
  }, [setSelectedPlace, setSidePanelContent, setSidePanelOpen]);

  if (!isReady || authLoading) {
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
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <Header />

      {/* Route Planner - Persistent Left Sidebar */}
      <RoutePlanner />

      <main id="main-content" className="w-full h-full">
        <MapView onMapClick={handleMapClick} onPoiClick={handlePoiClick}>
        <LayerControl />
        <SearchBar />
        <GPSIndicator />
        
        {/* Floating Action Buttons */}
        <div className="absolute bottom-20 left-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => {
              setSelectedPlace(null);
              setSidePanelContent('places');
              setSidePanelOpen(true);
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
            onClick={() => {
              setSidePanelContent('friends');
              setSidePanelOpen(true);
            }}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Friends"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <button
            onClick={() => {
              setSidePanelContent('profile');
              setSidePanelOpen(true);
            }}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Profile"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button
            onClick={() => {
              setSidePanelContent('trips');
              setSidePanelOpen(true);
            }}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Group Trips"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
          <button
            onClick={() => {
              setSidePanelContent('feed');
              setSidePanelOpen(true);
            }}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Social Feed"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
      </main>

      {/* Side Panel for Places */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'places'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
          setSelectedPlace(null);
        }}
        title={selectedPlace ? selectedPlace.name : 'Explore Places'}
        width="md"
      >
        {isLoadingPoi ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedPlace ? (
          <PlaceDetails
            place={selectedPlace}
            onClose={() => {
              setSelectedPlace(null);
            }}
          />
        ) : (
          <div className="space-y-0">
            <div className="p-4">
              <PlaceSearch />
            </div>
            <div className="border-t border-gray-200">
              <NearbyPlaces />
            </div>
          </div>
        )}
      </SidePanel>

      {/* Side Panel for Friends */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'friends'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
        }}
        title="Friends"
        width="md"
      >
        <div className="p-4">
          <FriendsPanel />
        </div>
      </SidePanel>

      {/* Side Panel for Profile */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'profile'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
        }}
        title="Profile"
        width="md"
      >
        <div className="p-4">
          <UserProfile />
        </div>
      </SidePanel>

      {/* Side Panel for Group Trips */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'trips'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
        }}
        title="Group Trips"
        width="md"
      >
        <div className="p-4">
          <GroupTripPlanner />
        </div>
      </SidePanel>

      {/* Side Panel for Social Feed */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'feed'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
        }}
        title="Social Feed"
        width="md"
      >
        <div className="p-4">
          <SocialFeed />
        </div>
      </SidePanel>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

// Helper function to infer category from Mapbox context
function inferCategoryFromContext(context?: Array<{ id: string; text: string }>): string | undefined {
  if (!context || context.length === 0) return 'place';
  
  // Check context for place type hints
  for (const ctx of context) {
    const id = ctx.id.toLowerCase();
    if (id.includes('poi')) return 'attraction';
    if (id.includes('place') || id.includes('locality')) return 'place';
    if (id.includes('address')) return 'place';
  }
  return 'place';
}

// Generate place enhancements (rating, photos, etc.)
function generatePlaceEnhancements(place: Place): Partial<Place> {
  const hash = place.name.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const normalized = Math.abs(hash % 100) / 100;

  return {
    rating: Math.round((3.5 + normalized * 1.5) * 10) / 10,
    reviewCount: 50 + Math.abs(hash % 300),
    priceLevel: place.category === 'restaurant' || place.category === 'hotel' ? 2 + (hash % 2) : 1 + (hash % 2),
    photos: [
      {
        id: 'main',
        url: getPlaceholderImage(place.name, 800, 600),
        width: 800,
        height: 600,
        attribution: 'Placeholder',
      },
      {
        id: 'thumb1',
        url: getPlaceholderThumbnail(0, 400, 300),
        width: 400,
        height: 300,
        attribution: 'Placeholder',
      },
    ],
    description: `${place.name} is a popular ${place.category || 'destination'} worth visiting.`,
    openingHours: {
      openNow: hash % 3 !== 0,
      weekdayText: [
        'Monday: 9:00 AM – 6:00 PM',
        'Tuesday: 9:00 AM – 6:00 PM',
        'Wednesday: 9:00 AM – 6:00 PM',
        'Thursday: 9:00 AM – 6:00 PM',
        'Friday: 9:00 AM – 8:00 PM',
        'Saturday: 10:00 AM – 6:00 PM',
        'Sunday: 10:00 AM – 4:00 PM',
      ],
    },
  };
}

export default App;
