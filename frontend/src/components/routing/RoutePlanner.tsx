import React, { useState, useEffect } from 'react';
import { useRouteStore } from '@/stores/routeStore';
import { routingService } from '@/services/api/routing.service';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
import { useLocationStore } from '@/stores/locationStore';
import { RoutingProfile } from '@shared/types/routing';
import { geocodingService } from '@/services/api/geocoding.service';
import { DirectionsList } from '../navigation/DirectionsList';
import { NavigationMode } from '../navigation/NavigationMode';
import { BottomSheet } from '../ui/BottomSheet';
import { ShareButton } from '../sharing/ShareButton';

const profiles: { value: RoutingProfile; icon: string; title: string }[] = [
  { value: 'driving', icon: '🚗', title: 'Drive' },
  { value: 'walking', icon: '🚶', title: 'Walk' },
  { value: 'cycling', icon: '🚴', title: 'Bike' },
  { value: 'transit', icon: '🚌', title: 'Transit' },
  { value: 'flight', icon: '✈️', title: 'Flight' },
];

export const RoutePlanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [showDirections, setShowDirections] = useState(false);

  const {
    waypoints,
    selectedProfile,
    routes,
    selectedRoute,
    isLoading,
    error,
    addWaypoint,
    removeWaypoint,
    setProfile,
    setRoutes,
    setSelectedRoute,
    setIsLoading,
    setError,
    clearRoute,
  } = useRouteStore();

  const { addRoute, clearRoutes } = useMapStore();
  const { setBottomSheetOpen, setBottomSheetContent } = useUIStore();
  const { currentLocation } = useLocationStore();

  // Listen for openRoutePlanner event
  useEffect(() => {
    const handleOpenRoutePlanner = () => {
      setIsOpen(true);
      // Update queries based on waypoints
      if (waypoints.length > 0) {
        setFromQuery(waypoints[0].name || '');
      }
      if (waypoints.length > 1) {
        setToQuery(waypoints[waypoints.length - 1].name || '');
      }
    };

    window.addEventListener('openRoutePlanner', handleOpenRoutePlanner);
    return () => {
      window.removeEventListener('openRoutePlanner', handleOpenRoutePlanner);
    };
  }, [waypoints]);

  // Auto-fill "from" with current location when it becomes available
  useEffect(() => {
    if (!currentLocation) return;

    if (waypoints.length === 0) {
      addWaypoint({
        coordinates: currentLocation,
        name: 'Current Location',
      });
      setFromQuery('Current Location');
    } else {
      const firstWaypoint = waypoints[0];
      if (firstWaypoint && firstWaypoint.name === 'Current Location') {
        const distance = Math.sqrt(
          Math.pow(currentLocation.latitude - firstWaypoint.coordinates.latitude, 2) +
          Math.pow(currentLocation.longitude - firstWaypoint.coordinates.longitude, 2)
        );
        if (distance > 0.001) {
          removeWaypoint(0);
          addWaypoint({
            coordinates: currentLocation,
            name: 'Current Location',
          });
        }
      }
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, waypoints.length, addWaypoint, removeWaypoint]);

  // Update queries when waypoints change (but not from user input)
  useEffect(() => {
    if (waypoints.length > 0) {
      const firstWaypointName = waypoints[0].name || '';
      if (fromQuery === '' || fromQuery === 'Current Location') {
        setFromQuery(firstWaypointName);
      }
    }
    if (waypoints.length > 1) {
      const lastWaypointName = waypoints[waypoints.length - 1].name || '';
      if (toQuery === '' || !toQuery) {
        setToQuery(lastWaypointName);
      }
    }
  }, [waypoints.length]); // Only depend on length to avoid infinite loops

  useEffect(() => {
    if (fromQuery.length >= 2 && fromQuery !== 'Current Location') {
      geocodingService.autocomplete(fromQuery).then(setFromSuggestions).catch(console.error);
    } else {
      setFromSuggestions([]);
    }
  }, [fromQuery]);

  useEffect(() => {
    if (toQuery.length >= 2) {
      geocodingService.autocomplete(toQuery).then(setToSuggestions).catch(console.error);
    } else {
      setToSuggestions([]);
    }
  }, [toQuery]);

  const handleCalculateRoute = async () => {
    if (waypoints.length < 2) {
      setError('Please enter a destination');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await routingService.getRoute({
        waypoints,
        profile: selectedProfile,
        alternatives: true,
        geometries: 'geojson',
        steps: true,
      });

      setRoutes(response.routes);
      clearRoutes();

      response.routes.forEach((route, index) => {
        addRoute({
          ...route,
          id: `route-${index}`,
          color: index === 0 ? '#3b82f6' : '#94a3b8',
          width: index === 0 ? 4 : 2,
        });
      });

      if (response.routes.length > 0) {
        setSelectedRoute(response.routes[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate route');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowDirections(false);
    clearRoute();
    clearRoutes();
    setFromQuery('');
    setToQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 left-4 z-20 px-4 py-3 bg-white text-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium"
      >
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Directions
      </button>
    );
  }

  return (
    <>
      <div className="absolute top-4 left-4 z-20 w-80">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Directions</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Inputs */}
          <div className="p-3 space-y-2">
            {/* From Input */}
            <div className="relative flex items-center gap-2">
              <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={fromQuery}
                  onChange={(e) => setFromQuery(e.target.value)}
                  placeholder="Starting point"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {currentLocation && fromQuery !== 'Current Location' && (
                  <button
                    onClick={() => {
                      setFromQuery('Current Location');
                      if (waypoints.length === 0) {
                        addWaypoint({ coordinates: currentLocation, name: 'Current Location' });
                      } else {
                        removeWaypoint(0);
                        addWaypoint({ coordinates: currentLocation, name: 'Current Location' });
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Use current location"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                    </svg>
                  </button>
                )}
                {fromSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {fromSuggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setFromQuery(s.placeName);
                          setFromSuggestions([]);
                          if (waypoints.length === 0) {
                            addWaypoint({ coordinates: s.coordinates, name: s.placeName });
                          } else {
                            removeWaypoint(0);
                            addWaypoint({ coordinates: s.coordinates, name: s.placeName });
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate"
                      >
                        {s.placeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-3 flex justify-center">
                <div className="w-0.5 h-4 bg-gray-300" />
              </div>
            </div>

            {/* To Input */}
            <div className="relative flex items-center gap-2">
              <div className="flex-shrink-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={toQuery}
                  onChange={(e) => setToQuery(e.target.value)}
                  placeholder="Destination"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {toSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {toSuggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setToQuery(s.placeName);
                          setToSuggestions([]);
                          if (waypoints.length <= 1) {
                            addWaypoint({ coordinates: s.coordinates, name: s.placeName });
                          } else {
                            removeWaypoint(waypoints.length - 1);
                            addWaypoint({ coordinates: s.coordinates, name: s.placeName });
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate"
                      >
                        {s.placeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Transport Mode Buttons */}
            <div className="flex gap-1 pt-1">
              {profiles.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setProfile(p.value)}
                  title={p.title}
                  className={`flex-1 py-2 rounded-lg text-lg transition-all ${
                    selectedProfile === p.value
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {p.icon}
                </button>
              ))}
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded">{error}</div>
            )}

            {/* Calculate Button */}
            <button
              onClick={handleCalculateRoute}
              disabled={isLoading || waypoints.length < 2}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating...
                </span>
              ) : (
                'Get Directions'
              )}
            </button>
          </div>

          {/* Route Result */}
          {selectedRoute && (
            <div className="border-t border-gray-100">
              {/* Summary Row */}
              <div className="flex items-center justify-between px-3 py-3 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{profiles.find(p => p.value === selectedProfile)?.icon}</span>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{formatDuration(selectedRoute.duration)}</div>
                    <div className="text-sm text-gray-500">{formatDistance(selectedRoute.distance)}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowNavigation(true)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setShowDirections(!showDirections)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    {showDirections ? 'Hide' : 'Steps'}
                  </button>
                  <ShareButton
                    route={{
                      waypoints,
                      profile: selectedProfile,
                      distance: selectedRoute.distance,
                      duration: selectedRoute.duration,
                    }}
                    compact
                  />
                </div>
              </div>

              {/* Alternative Routes */}
              {routes.length > 1 && (
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">Alternatives</div>
                  <div className="flex gap-2 overflow-x-auto">
                    {routes.map((route, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedRoute(route);
                          clearRoutes();
                          routes.forEach((r, i) => {
                            addRoute({
                              ...r,
                              id: `route-${i}`,
                              color: i === index ? '#3b82f6' : '#94a3b8',
                              width: i === index ? 4 : 2,
                            });
                          });
                        }}
                        className={`flex-shrink-0 px-2 py-1 rounded text-xs transition-colors ${
                          selectedRoute === route
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {formatDuration(route.duration)} · {formatDistance(route.distance)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Flight Info (compact) */}
              {selectedRoute.flightInfo && (
                <div className="px-3 py-2 border-t border-gray-100 bg-blue-50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-900">
                      ✈️ {selectedRoute.flightInfo.airline} {selectedRoute.flightInfo.flightNumber || ''}
                    </span>
                    {selectedRoute.flightInfo.flightStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedRoute.flightInfo.flightStatus === 'active' ? 'bg-green-100 text-green-700' :
                        selectedRoute.flightInfo.flightStatus === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedRoute.flightInfo.flightStatus}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {selectedRoute.flightInfo.departureIata} → {selectedRoute.flightInfo.arrivalIata}
                  </div>
                </div>
              )}

              {/* Inline Directions */}
              {showDirections && (
                <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
                  <DirectionsList route={selectedRoute} compact />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Mode */}
      {showNavigation && selectedRoute && (
        <NavigationMode
          route={selectedRoute}
          onExit={() => setShowNavigation(false)}
        />
      )}

      {/* Bottom Sheet for Full Directions */}
      <BottomSheet
        isOpen={false}
        onClose={() => {
          setBottomSheetOpen(false);
          setBottomSheetContent(null);
        }}
        title="Directions"
        maxHeight="80vh"
      >
        {selectedRoute && <DirectionsList route={selectedRoute} />}
      </BottomSheet>
    </>
  );
};
