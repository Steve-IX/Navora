import React, { useState, useEffect, useRef } from 'react';
import { useRouteStore } from '@/stores/routeStore';
import { routingService } from '@/services/api/routing.service';
import { useMapStore } from '@/stores/mapStore';
import { useLocationStore } from '@/stores/locationStore';
import { RoutingProfile } from '@shared/types/routing';
import { geocodingService } from '@/services/api/geocoding.service';
import { X, MapPin, Navigation } from 'lucide-react';

const TRANSPORT_MODES: { value: RoutingProfile; icon: string; label: string }[] = [
  { value: 'driving', icon: '🚗', label: 'Drive' },
  { value: 'walking', icon: '🚶', label: 'Walk' },
  { value: 'cycling', icon: '🚴', label: 'Bike' },
  { value: 'transit', icon: '🚌', label: 'Transit' },
  { value: 'flight', icon: '✈️', label: 'Flight' },
];

/**
 * Route Planner Component - Rebuilt from scratch
 * Clean, simple, Google Maps-inspired design
 */
export const RoutePlanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

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

  const { addRoute, clearRoutes, setCenter } = useMapStore();
  const { currentLocation } = useLocationStore();

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const programmaticallyOpenedRef = useRef(false);

  // Listen for openRoutePlanner event
  useEffect(() => {
    const handleOpenRoutePlanner = (event?: CustomEvent) => {
      setIsOpen(true);
      programmaticallyOpenedRef.current = true;

      if (event?.detail?.destination) {
        const dest = event.detail.destination;
        clearRoute();
        
        if (currentLocation) {
          addWaypoint({
            coordinates: currentLocation,
            name: 'Current Location',
          });
        }
        
        addWaypoint({
          coordinates: dest.coordinates,
          name: dest.name,
        });
        
        setFromQuery('Current Location');
        setToQuery(dest.name);
      }

      setTimeout(() => {
        programmaticallyOpenedRef.current = false;
      }, 1000);
    };

    window.addEventListener('openRoutePlanner', handleOpenRoutePlanner as EventListener);
    return () => {
      window.removeEventListener('openRoutePlanner', handleOpenRoutePlanner as EventListener);
    };
  }, [currentLocation, addWaypoint, clearRoute]);

  // Sync waypoints with input queries
  useEffect(() => {
    if (waypoints.length > 0 && !programmaticallyOpenedRef.current) {
      setFromQuery(waypoints[0].name || '');
    }
    if (waypoints.length > 1) {
      setToQuery(waypoints[waypoints.length - 1].name || '');
    }
  }, [waypoints]);

  // Auto-fill origin with current location
  useEffect(() => {
    if (currentLocation && waypoints.length === 0 && !programmaticallyOpenedRef.current) {
      addWaypoint({
        coordinates: currentLocation,
        name: 'Current Location',
      });
      setFromQuery('Current Location');
    }
  }, [currentLocation, waypoints.length, addWaypoint]);

  // Handle from input change
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromQuery(value);
    setShowFromSuggestions(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (value.length >= 2 && value !== 'Current Location') {
        geocodingService.autocomplete(value).then((results) => {
          setFromSuggestions(results);
        }).catch(() => {
          setFromSuggestions([]);
        });
      } else {
        setFromSuggestions([]);
      }
    }, 300);
  };

  // Handle to input change
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToQuery(value);
    setShowToSuggestions(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (value.length >= 2) {
        geocodingService.autocomplete(value).then((results) => {
          setToSuggestions(results);
        }).catch(() => {
          setToSuggestions([]);
        });
      } else {
        setToSuggestions([]);
      }
    }, 300);
  };

  // Handle suggestion selection
  const handleFromSuggestionSelect = (suggestion: any) => {
    setFromQuery(suggestion.placeName);
    setShowFromSuggestions(false);
    
    if (waypoints.length > 0) {
      removeWaypoint(0);
    }
    
    addWaypoint({
      coordinates: suggestion.coordinates,
      name: suggestion.placeName,
    }, 0);
  };

  const handleToSuggestionSelect = (suggestion: any) => {
    setToQuery(suggestion.placeName);
    setShowToSuggestions(false);
    
    if (waypoints.length > 1) {
      removeWaypoint(waypoints.length - 1);
    }
    
    addWaypoint({
      coordinates: suggestion.coordinates,
      name: suggestion.placeName,
    });
  };

  // Calculate route
  const handleCalculateRoute = async () => {
    if (waypoints.length < 2) {
      setError('Please enter both origin and destination');
      return;
    }

    setIsLoading(true);
    setError(null);
    clearRoutes();

    try {
      const response = await routingService.getRoute({
        waypoints,
        profile: selectedProfile,
        alternatives: true,
        geometries: 'geojson',
        steps: true,
      });

      setRoutes(response.routes);

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
        // Center map on route
        if (response.routes[0].geometry.coordinates.length > 0) {
          const midPoint = response.routes[0].geometry.coordinates[
            Math.floor(response.routes[0].geometry.coordinates.length / 2)
          ];
          setCenter(midPoint);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to calculate route';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Directions</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Origin Input */}
          <div className="relative">
            <div className="flex items-center gap-2 p-3 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
              <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
              <input
                type="text"
                value={fromQuery}
                onChange={handleFromChange}
                onFocus={() => setShowFromSuggestions(true)}
                placeholder="Choose starting point"
                className="flex-1 outline-none"
              />
              {currentLocation && (
                <button
                  onClick={() => {
                    if (currentLocation) {
                      if (waypoints.length > 0) {
                        removeWaypoint(0);
                      }
                      addWaypoint({
                        coordinates: currentLocation,
                        name: 'Current Location',
                      }, 0);
                      setFromQuery('Current Location');
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Use current location"
                >
                  <Navigation className="w-4 h-4 text-blue-500" />
                </button>
              )}
            </div>
            
            {/* From Suggestions */}
            {showFromSuggestions && fromSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {fromSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleFromSuggestionSelect(suggestion)}
                    className="w-full text-left p-3 hover:bg-gray-50 flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{suggestion.placeName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Input */}
          <div className="relative">
            <div className="flex items-center gap-2 p-3 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
              <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
              <input
                type="text"
                value={toQuery}
                onChange={handleToChange}
                onFocus={() => setShowToSuggestions(true)}
                placeholder="Choose destination"
                className="flex-1 outline-none"
              />
            </div>
            
            {/* To Suggestions */}
            {showToSuggestions && toSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {toSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleToSuggestionSelect(suggestion)}
                    className="w-full text-left p-3 hover:bg-gray-50 flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{suggestion.placeName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transport Mode Selection */}
          <div className="flex gap-2">
            {TRANSPORT_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setProfile(mode.value)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  selectedProfile === mode.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{mode.icon}</div>
                <div className="text-xs font-medium">{mode.label}</div>
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Get Directions Button */}
          <button
            onClick={handleCalculateRoute}
            disabled={isLoading || waypoints.length < 2}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Calculating...' : 'Get Directions'}
          </button>

          {/* Route Results */}
          {selectedRoute && !error && (
            <div className="space-y-4 pt-4 border-t">
              {/* Route Summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {selectedProfile === 'flight' ? '✈️' : 
                     selectedProfile === 'walking' ? '🚶' :
                     selectedProfile === 'cycling' ? '🚴' :
                     selectedProfile === 'transit' ? '🚌' : '🚗'}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{formatDuration(selectedRoute.duration)}</div>
                    <div className="text-sm text-gray-600">{formatDistance(selectedRoute.distance)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
                    Start
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
                    Steps
                  </button>
                </div>
              </div>

              {/* Flight Info */}
              {selectedRoute.flightInfo && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium mb-2">Flight Details</div>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Departure:</span> {selectedRoute.flightInfo.departureAirport} ({selectedRoute.flightInfo.departureIata})
                    </div>
                    <div>
                      <span className="font-medium">Arrival:</span> {selectedRoute.flightInfo.arrivalAirport} ({selectedRoute.flightInfo.arrivalIata})
                    </div>
                  </div>
                </div>
              )}

              {/* Route Legs */}
              {selectedRoute.legs && selectedRoute.legs.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">Journey</div>
                  {selectedRoute.legs.map((leg, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                      <div className="text-xl mt-0.5">
                        {leg.transportMode === 'flight' ? '✈️' :
                         leg.transportMode === 'walking' ? '🚶' :
                         leg.transportMode === 'cycling' ? '🚴' :
                         leg.transportMode === 'transit' ? '🚌' : '🚗'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{leg.modeLabel || leg.transportMode}</div>
                        <div className="text-sm text-gray-600">
                          {formatDuration(leg.duration)} · {formatDistance(leg.distance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
