import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  UserIcon,
  MapIcon,
  NewspaperIcon,
  CloudIcon,
  PaperAirplaneIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { MapView } from './components/map/MapView';
import { LayerControl } from './components/map/LayerControl';
import { SearchBar } from './components/search/SearchBar';
import { RoutePlanner } from './components/routing/RoutePlanner';
import { GPSIndicator } from './components/location/GPSIndicator';
import { SidePanel, Header } from './components/layout';
import { PlaceSearch, PlaceDetails, NearbyPlaces } from './components/places';
import { WeatherPanel } from './components/weather';
import { MeasurementTool } from './components/tools';
import { FriendsPanel, UserProfile, SocialFeed } from './components/social';
import { FlightSearch } from './components/flights';
import { GroupTripPlanner } from './components/trips';
import { IconButton } from './components/atoms/IconButton';
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

// Custom Ruler icon (Heroicons doesn't have one)
const RulerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2m4 0h2m4 0h2m4 0h2M3 6v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v4M12 4v6M17 4v4" />
  </svg>
);

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

function App() {
  const [isReady, setIsReady] = useState(false);
  const { setCenter, setZoom } = useMapStore();
  const { selectedPlace, setSelectedPlace } = usePlacesStore();
  const {
    sidePanelOpen,
    sidePanelContent,
    setSidePanelOpen,
    setSidePanelContent,
    isMapInteracting,
  } = useUIStore();
  const { addWaypoint, setProfile } = useRouteStore();
  const { updateFriendLocation } = useLocationShareStore();
  const { currentLocation, isTracking, setIsTracking, setError } = useLocationStore();
  const { initializeAuth, isAuthenticated, token, isLoading: authLoading } = useAuthStore();
  const [showMeasurementTool, setShowMeasurementTool] = useState(false);
  const [isLoadingPoi, setIsLoadingPoi] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);

  useEffect(() => {
    if (isMapInteracting) {
      setIsSecondaryOpen(false);
    }
  }, [isMapInteracting]);

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

  const handleStopTracking = () => {
    locationService.stopTracking();
    setIsTracking(false);
    setError(null);
  };

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
        <SearchBar />
        <div className="absolute top-20 left-4 z-20 flex flex-col gap-2">
          <LayerControl />
          <GPSIndicator variant="compact" />
        </div>
        
        {/* Secondary controls menu */}
        <motion.div
          animate={{ opacity: isMapInteracting ? 0 : 1, y: isMapInteracting ? 8 : 0 }}
          transition={{ duration: 0.2 }}
          className={`absolute bottom-20 left-4 z-20 ${isMapInteracting ? 'pointer-events-none' : ''}`}
        >
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {isSecondaryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-elevation-3 dark:shadow-dark-md p-2 space-y-1 min-w-[180px]"
                >
                  <button
                    onClick={() => {
                      setSidePanelContent('weather');
                      setSidePanelOpen(true);
                      setIsSecondaryOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary"
                  >
                    <CloudIcon className="w-4 h-4 text-sky-500" />
                    Weather
                  </button>
                  <button
                    onClick={() => {
                      setSidePanelContent('flights');
                      setSidePanelOpen(true);
                      setIsSecondaryOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary"
                  >
                    <PaperAirplaneIcon className="w-4 h-4 text-indigo-500 -rotate-45" />
                    Flights
                  </button>
                  <button
                    onClick={() => {
                      setShowMeasurementTool(!showMeasurementTool);
                      setIsSecondaryOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary"
                  >
                    <RulerIcon className="w-4 h-4 text-emerald-500" />
                    Measurement
                  </button>
                  <button
                    onClick={() => {
                      setSidePanelContent('friends');
                      setSidePanelOpen(true);
                      setIsSecondaryOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary"
                  >
                    <UsersIcon className="w-4 h-4 text-violet-500" />
                    Friends
                  </button>
                  <button
                    onClick={() => {
                      setSidePanelContent('profile');
                      setSidePanelOpen(true);
                      setIsSecondaryOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary"
                  >
                    <UserIcon className="w-4 h-4 text-slate-500" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setSidePanelContent('trips');
                      setSidePanelOpen(true);
                      setIsSecondaryOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary"
                  >
                    <MapIcon className="w-4 h-4 text-teal-500" />
                    Trips
                  </button>
                  <button
                    onClick={() => {
                      setSidePanelContent('feed');
                      setSidePanelOpen(true);
                      setIsSecondaryOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary"
                  >
                    <NewspaperIcon className="w-4 h-4 text-amber-500" />
                    Social Feed
                  </button>
                  {isTracking && (
                    <button
                      onClick={() => {
                        handleStopTracking();
                        setIsSecondaryOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Stop tracking
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <IconButton
              icon={<Squares2X2Icon className="w-5 h-5" />}
              onClick={() => setIsSecondaryOpen(!isSecondaryOpen)}
              tooltip="More tools"
              tooltipPosition="right"
              variant="default"
              aria-label="Open secondary tools menu"
            />
          </div>
        </motion.div>

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

      {/* Side Panel for Weather */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'weather'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
        }}
        width="md"
      >
        <WeatherPanel />
      </SidePanel>

      {/* Side Panel for Flights */}
      <SidePanel
        isOpen={sidePanelOpen && sidePanelContent === 'flights'}
        onClose={() => {
          setSidePanelOpen(false);
          setSidePanelContent(null);
        }}
        width="md"
      >
        <FlightSearch />
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
