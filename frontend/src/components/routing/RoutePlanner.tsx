import React, { useState, useEffect } from 'react';
import { useRouteStore } from '@/stores/routeStore';
import { routingService } from '@/services/api/routing.service';
import { useMapStore } from '@/stores/mapStore';
import { RoutingProfile } from '@shared/types/routing';
import { geocodingService } from '@/services/api/geocoding.service';

const profiles: { value: RoutingProfile; label: string; icon: string }[] = [
  { value: 'driving', label: 'Driving', icon: '🚗' },
  { value: 'walking', label: 'Walking', icon: '🚶' },
  { value: 'cycling', label: 'Cycling', icon: '🚴' },
  { value: 'transit', label: 'Transit', icon: '🚌' },
  { value: 'flight', label: 'Flight', icon: '✈️' },
];

export const RoutePlanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);

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

  useEffect(() => {
    if (fromQuery.length >= 2) {
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
      setError('Please provide at least two waypoints');
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

      // Clear existing routes from map
      clearRoutes();

      // Add routes to map
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
    return `${minutes}m`;
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-4">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Plan Route
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Route Planner</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  clearRoute();
                  clearRoutes();
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close route planner"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={fromQuery}
                  onChange={(e) => setFromQuery(e.target.value)}
                  placeholder="From"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {fromSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30 max-h-48 overflow-y-auto">
                    {fromSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => {
                          setFromQuery(suggestion.placeName);
                          setFromSuggestions([]);
                          if (waypoints.length === 0) {
                            addWaypoint({
                              coordinates: suggestion.coordinates,
                              name: suggestion.placeName,
                            });
                          } else {
                            // Update first waypoint
                            removeWaypoint(0);
                            addWaypoint({
                              coordinates: suggestion.coordinates,
                              name: suggestion.placeName,
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        {suggestion.placeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={toQuery}
                  onChange={(e) => setToQuery(e.target.value)}
                  placeholder="To"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {toSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30 max-h-48 overflow-y-auto">
                    {toSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => {
                          setToQuery(suggestion.placeName);
                          setToSuggestions([]);
                          if (waypoints.length <= 1) {
                            addWaypoint({
                              coordinates: suggestion.coordinates,
                              name: suggestion.placeName,
                            });
                          } else {
                            // Update last waypoint
                            const lastIndex = waypoints.length - 1;
                            removeWaypoint(lastIndex);
                            addWaypoint({
                              coordinates: suggestion.coordinates,
                              name: suggestion.placeName,
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        {suggestion.placeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {profiles.map((profile) => (
                <button
                  key={profile.value}
                  onClick={() => setProfile(profile.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedProfile === profile.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{profile.icon}</span>
                  {profile.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
            )}

            <button
              onClick={handleCalculateRoute}
              disabled={isLoading || waypoints.length < 2}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Calculating...' : 'Calculate Route'}
            </button>

            {selectedRoute && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Distance:</span>
                  <span>{formatDistance(selectedRoute.distance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Duration:</span>
                  <span>{formatDuration(selectedRoute.duration)}</span>
                </div>
                {routes.length > 1 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Alternative routes:</div>
                    {routes.slice(1).map((route, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedRoute(route);
                          clearRoutes();
                          routes.forEach((r, i) => {
                            addRoute({
                              ...r,
                              id: `route-${i}`,
                              color: i === index + 1 ? '#3b82f6' : '#94a3b8',
                              width: i === index + 1 ? 4 : 2,
                            });
                          });
                        }}
                        className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        {formatDistance(route.distance)} • {formatDuration(route.duration)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

