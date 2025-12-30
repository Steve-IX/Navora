import React, { useState, useEffect, useRef } from 'react';
import { useRouteStore } from '@/stores/routeStore';
import { routingService } from '@/services/api/routing.service';
import { useMapStore } from '@/stores/mapStore';
import { useLocationStore } from '@/stores/locationStore';
import { RoutingProfile } from '@shared/types/routing';
import { geocodingService } from '@/services/api/geocoding.service';

// Icon components
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const NavigationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const DirectionsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const TRANSPORT_MODES: { value: RoutingProfile; icon: string; label: string; color: string }[] = [
  { value: 'driving', icon: '🚗', label: 'Drive', color: 'bg-red-500' },
  { value: 'walking', icon: '🚶', label: 'Walk', color: 'bg-orange-500' },
  { value: 'cycling', icon: '🚴', label: 'Bike', color: 'bg-orange-500' },
  { value: 'transit', icon: '🚌', label: 'Transit', color: 'bg-blue-500' },
  { value: 'flight', icon: '✈️', label: 'Flight', color: 'bg-blue-500' },
];

/**
 * Route Planner Component - Google Maps-style persistent sidebar
 * Left-hand sidebar that remains visible while interacting with the map
 */
export const RoutePlanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const {
    waypoints,
    selectedProfile,
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
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Listen for openRoutePlanner event
  useEffect(() => {
    const handleOpenRoutePlanner = (event?: CustomEvent) => {
      setIsExpanded(true);
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
    });
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

  // Get transport mode icon
  const getTransportIcon = (mode?: string) => {
    switch (mode) {
      case 'flight': return '✈️';
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      case 'transit': return '🚌';
      case 'transfer': return '🔄';
      default: return '🚗';
    }
  };

  // Get transport mode color
  const getTransportColor = (mode?: string) => {
    switch (mode) {
      case 'flight': return 'text-blue-600';
      case 'walking': return 'text-orange-600';
      case 'cycling': return 'text-orange-600';
      case 'transit': return 'text-blue-600';
      case 'transfer': return 'text-gray-600';
      default: return 'text-red-600';
    }
  };

  // Responsive sidebar width: full width on mobile, fixed width on desktop
  const sidebarWidth = isExpanded 
    ? 'w-full sm:w-96' 
    : 'w-0';
  const contentOpacity = isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none';

  return (
    <>
      {/* Floating Action Button - Directions */}
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-4 left-4 z-30 p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all hover:shadow-xl active:scale-95 ${isExpanded ? 'hidden sm:block' : ''}`}
        aria-label="Open Directions"
        title="Directions"
      >
        <DirectionsIcon />
      </button>

      {/* Persistent Left Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full bg-white shadow-2xl z-40 transform transition-all duration-300 ease-in-out ${sidebarWidth} flex flex-col`}
      >
        {/* Collapse/Expand Button - Hidden on mobile, visible on desktop */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`hidden sm:block absolute -right-12 top-4 p-2 bg-white rounded-r-lg shadow-lg hover:bg-gray-50 transition-colors z-50 ${isExpanded ? '' : 'rotate-180'}`}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </button>

        {/* Sidebar Content */}
        <div className={`flex-1 overflow-hidden flex flex-col transition-opacity duration-300 ${contentOpacity}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">Directions</h2>
            <button
              onClick={() => {
                setIsExpanded(false);
                clearRoute();
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close directions"
            >
              <XIcon />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Origin Input */}
            <div className="relative">
              <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <input
                  type="text"
                  value={fromQuery}
                  onChange={handleFromChange}
                  onFocus={() => setShowFromSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                  placeholder="Choose starting point"
                  className="flex-1 outline-none text-sm"
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
                        });
                        setFromQuery('Current Location');
                      }
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Use current location"
                  >
                    <NavigationIcon />
                  </button>
                )}
              </div>
              
              {/* From Suggestions */}
              {showFromSuggestions && fromSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {fromSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleFromSuggestionSelect(suggestion)}
                      className="w-full text-left p-3 hover:bg-gray-50 flex items-start gap-3 transition-colors"
                    >
                      <MapPinIcon />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{suggestion.placeName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Input */}
            <div className="relative">
              <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <input
                  type="text"
                  value={toQuery}
                  onChange={handleToChange}
                  onFocus={() => setShowToSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                  placeholder="Choose destination"
                  className="flex-1 outline-none text-sm"
                />
              </div>
              
              {/* To Suggestions */}
              {showToSuggestions && toSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {toSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleToSuggestionSelect(suggestion)}
                      className="w-full text-left p-3 hover:bg-gray-50 flex items-start gap-3 transition-colors"
                    >
                      <MapPinIcon />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{suggestion.placeName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transport Mode Selection */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
              {TRANSPORT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setProfile(mode.value)}
                  className={`flex-1 min-w-[60px] p-3 rounded-lg border-2 transition-all ${
                    selectedProfile === mode.value
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {isLoading ? 'Calculating...' : 'Get Directions'}
            </button>

            {/* Route Results */}
            {selectedRoute && !error && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                {/* Route Summary */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">
                      {getTransportIcon(selectedProfile)}
                    </div>
                    <div>
                      <div className="font-semibold text-xl text-gray-900">{formatDuration(selectedRoute.duration)}</div>
                      <div className="text-sm text-gray-600">{formatDistance(selectedRoute.distance)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors shadow-sm"
                      onClick={() => {/* TODO: Start navigation */}}
                    >
                      Start
                    </button>
                    <button 
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      onClick={() => setShowSteps(!showSteps)}
                    >
                      {showSteps ? 'Hide' : 'Steps'}
                    </button>
                  </div>
                </div>

                {/* Flight Info */}
                {selectedRoute.flightInfo && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="font-medium mb-2 text-gray-900">Flight Details</div>
                    <div className="text-sm space-y-1 text-gray-700">
                      <div>
                        <span className="font-medium">Departure:</span> {selectedRoute.flightInfo.departureAirport} ({selectedRoute.flightInfo.departureIata})
                      </div>
                      <div>
                        <span className="font-medium">Arrival:</span> {selectedRoute.flightInfo.arrivalAirport} ({selectedRoute.flightInfo.arrivalIata})
                      </div>
                    </div>
                  </div>
                )}

                {/* Journey Breakdown */}
                {selectedRoute.legs && selectedRoute.legs.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium text-gray-900 mb-2">Journey Breakdown</div>
                    {selectedRoute.legs.map((leg, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100 cursor-pointer"
                        onClick={() => {
                          // Scroll to this leg on the map (if implemented)
                        }}
                      >
                        <div className={`text-2xl mt-0.5 flex-shrink-0 ${getTransportColor(leg.transportMode)}`}>
                          {getTransportIcon(leg.transportMode)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">{leg.modeLabel || leg.transportMode}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDuration(leg.duration)} · {formatDistance(leg.distance)}
                          </div>
                          {leg.steps && leg.steps.some(step => step.transferInfo) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {leg.steps.find(step => step.transferInfo)?.transferInfo?.airport && 
                                `Transfer at ${leg.steps.find(step => step.transferInfo)?.transferInfo?.airport}`}
                              {leg.steps.find(step => step.transferInfo)?.transferInfo?.layoverDuration && 
                                ` · Layover: ${formatDuration(leg.steps.find(step => step.transferInfo)?.transferInfo?.layoverDuration || 0)}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detailed Steps (Expandable) */}
                {showSteps && selectedRoute.legs && selectedRoute.legs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="font-medium text-gray-900 mb-2">Step-by-Step Directions</div>
                    {selectedRoute.legs.map((leg, legIndex) => (
                      <div key={legIndex} className="space-y-1">
                        {leg.steps && leg.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-3 p-2 text-sm">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                              {stepIndex + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-900">{step.instruction || 'Continue'}</div>
                              <div className="text-gray-500 text-xs mt-0.5">
                                {formatDistance(step.distance)} · {formatDuration(step.duration)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
