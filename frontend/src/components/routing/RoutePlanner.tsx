import React, { useState, useEffect, useRef } from 'react';
import { useRouteStore } from '@/stores/routeStore';
import { routingService } from '@/services/api/routing.service';
import { useMapStore } from '@/stores/mapStore';
import { useLocationStore } from '@/stores/locationStore';
import { RoutingProfile } from '@shared/types/routing';
import { geocodingService } from '@/services/api/geocoding.service';
import { NavigationMode } from '@/components/navigation/NavigationMode';
import { getTransportIcon as getTransportIconComponent } from '@/components/icons/TransportIcons';

// Icon components
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

const TRANSPORT_MODES: { value: RoutingProfile; label: string; color: string }[] = [
  { value: 'driving', label: 'Drive', color: 'bg-red-500' },
  { value: 'walking', label: 'Walk', color: 'bg-orange-500' },
  { value: 'cycling', label: 'Bike', color: 'bg-orange-500' },
  { value: 'transit', label: 'Transit', color: 'bg-blue-500' },
  { value: 'flight', label: 'Flight', color: 'bg-blue-500' },
];

/**
 * Route Planner Component - Google Maps-style persistent sidebar
 * Left-hand sidebar that remains visible while interacting with the map
 */
export const RoutePlanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
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
    isNavigating,
    addWaypoint,
    removeWaypoint,
    setProfile,
    setRoutes,
    setSelectedRoute,
    setIsLoading,
    setError,
    clearRoute,
    startNavigation,
    stopNavigation,
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

  // Get transport mode icon component
  const getTransportIcon = (mode?: string) => {
    const IconComponent = getTransportIconComponent(mode);
    return <IconComponent className="w-6 h-6" />;
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

    // Show NavigationMode when navigating
  if (isNavigating && selectedRoute) {
    return <NavigationMode route={selectedRoute} onExit={stopNavigation} />;
  }

  return (
    <>
      {/* Floating Action Button - Directions */}
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-6 left-4 md:bottom-4 z-30 p-4 md:p-3.5 bg-white/70 dark:bg-dark-bg-secondary/60 backdrop-blur-md rounded-full shadow-lg dark:shadow-dark-md border border-white/40 dark:border-white/10 hover:bg-white/40 dark:hover:bg-dark-bg-tertiary/60 transition-all hover:shadow-xl active:scale-95 min-w-[56px] min-h-[56px] md:min-w-0 md:min-h-0 flex items-center justify-center ${isExpanded ? 'hidden sm:block' : ''}`}
        aria-label="Open Directions"
        title="Directions"
      >
        <DirectionsIcon />
      </button>

      {/* Persistent Left Sidebar - Positioned below header */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-[52px] md:top-[44px] h-[calc(100%-52px)] md:h-[calc(100%-44px)] bg-white/80 dark:bg-dark-bg-secondary/70 backdrop-blur-lg shadow-2xl z-40 transform transition-all duration-300 ease-in-out ${sidebarWidth} flex flex-col border-r border-white/40 dark:border-white/10`}
      >
        {/* Sidebar Content */}
        <div className={`flex-1 overflow-hidden flex flex-col transition-opacity duration-300 ${contentOpacity}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border-default flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Directions</h2>
            <button
              onClick={() => {
                setIsExpanded(false);
                clearRoute();
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-full transition-colors text-gray-700 dark:text-dark-text-secondary"
              aria-label="Close directions"
            >
              <XIcon />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Origin Input */}
            <div className="relative">
              <div className="flex items-center gap-2 p-3 border border-gray-300 dark:border-dark-border-default rounded-lg focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-primary-500 focus-within:border-blue-500 transition-all bg-white dark:bg-dark-bg-primary">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <input
                  type="text"
                  value={fromQuery}
                  onChange={handleFromChange}
                  onFocus={() => setShowFromSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                  placeholder="Choose starting point"
                  className="flex-1 outline-none text-sm bg-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-muted"
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
                    className="p-1 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded transition-colors text-gray-600 dark:text-dark-text-secondary"
                    title="Use current location"
                  >
                    <NavigationIcon />
                  </button>
                )}
              </div>

              {/* From Suggestions */}
              {showFromSuggestions && fromSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-lg shadow-xl dark:shadow-dark-md max-h-60 overflow-y-auto">
                  {fromSuggestions.map((suggestion, index) => (
                      <button
                      key={index}
                      onClick={() => handleFromSuggestionSelect(suggestion)}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary flex items-start gap-3 transition-colors text-gray-900 dark:text-dark-text-primary"
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
              <div className="flex items-center gap-2 p-3 border border-gray-300 dark:border-dark-border-default rounded-lg focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-primary-500 focus-within:border-blue-500 transition-all bg-white dark:bg-dark-bg-primary">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <input
                  type="text"
                  value={toQuery}
                  onChange={handleToChange}
                  onFocus={() => setShowToSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                  placeholder="Choose destination"
                  className="flex-1 outline-none text-sm bg-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-muted"
                />
              </div>

              {/* To Suggestions */}
              {showToSuggestions && toSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-lg shadow-xl dark:shadow-dark-md max-h-60 overflow-y-auto">
                  {toSuggestions.map((suggestion, index) => (
                      <button
                      key={index}
                      onClick={() => handleToSuggestionSelect(suggestion)}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary flex items-start gap-3 transition-colors text-gray-900 dark:text-dark-text-primary"
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
              {TRANSPORT_MODES.map((mode) => {
                const IconComponent = getTransportIconComponent(mode.value);
                return (
                  <button
                    key={mode.value}
                    onClick={() => setProfile(mode.value)}
                    className={`flex-1 min-w-[60px] p-3 rounded-lg border-2 transition-all ${
                      selectedProfile === mode.value
                        ? 'border-blue-500 dark:border-primary-500 bg-blue-50 dark:bg-primary-900/30 shadow-sm'
                        : 'border-gray-200 dark:border-dark-border-default hover:border-gray-300 dark:hover:border-dark-border-subtle hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                    }`}
                  >
                    <div className="mb-1 flex justify-center">
                      <IconComponent className={`w-6 h-6 ${selectedProfile === mode.value ? 'text-blue-600 dark:text-primary-400' : 'text-gray-700 dark:text-dark-text-secondary'}`} />
                    </div>
                    <div className={`text-xs font-medium ${selectedProfile === mode.value ? 'text-blue-700 dark:text-primary-300' : 'text-gray-900 dark:text-dark-text-primary'}`}>{mode.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Get Directions Button */}
            <button
              onClick={handleCalculateRoute}
              disabled={isLoading || waypoints.length < 2}
              className="w-full py-3 bg-blue-500 dark:bg-primary-600 text-white rounded-lg font-medium hover:bg-blue-600 dark:hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {isLoading ? 'Calculating...' : 'Get Directions'}
            </button>

            {/* Route Results */}
            {selectedRoute && !error && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-border-default">
                {/* Route Summary */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-gray-700 dark:text-dark-text-secondary">
                      {getTransportIcon(selectedProfile)}
                    </div>
                  <div>
                      <div className="font-semibold text-xl text-gray-900 dark:text-dark-text-primary">{formatDuration(selectedRoute.duration)}</div>
                      <div className="text-sm text-gray-600 dark:text-dark-text-secondary">{formatDistance(selectedRoute.distance)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                  <button
                      className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-600 dark:hover:bg-green-700 transition-colors shadow-sm"
                      onClick={() => {
                        if (selectedRoute) {
                          startNavigation();
                        }
                      }}
                  >
                    Start
                  </button>
                  <button
                      className="px-4 py-2 bg-gray-200 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-dark-bg-overlay transition-colors"
                      onClick={() => setShowSteps(!showSteps)}
                  >
                      {showSteps ? 'Hide' : 'Steps'}
                  </button>
                  </div>
                </div>

                {/* Flight Info */}
                {selectedRoute.flightInfo && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div className="font-medium mb-2 text-gray-900 dark:text-dark-text-primary">Flight Details</div>
                    <div className="text-sm space-y-1 text-gray-700 dark:text-dark-text-secondary">
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
                    <div className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">Journey Breakdown</div>
                    {selectedRoute.legs.map((leg, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors border border-gray-100 dark:border-dark-border-subtle cursor-pointer"
                        onClick={() => {
                          // Scroll to this leg on the map (if implemented)
                        }}
                      >
                        <div className={`mt-0.5 flex-shrink-0 flex items-center ${getTransportColor(leg.transportMode)}`}>
                          {getTransportIcon(leg.transportMode)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-dark-text-primary">{leg.modeLabel || leg.transportMode}</div>
                          <div className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                            {formatDuration(leg.duration)} · {formatDistance(leg.distance)}
                          </div>
                          {leg.steps && leg.steps.some(step => step.transferInfo) && (
                            <div className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
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
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-dark-border-default">
                    <div className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">Step-by-Step Directions</div>
                    {selectedRoute.legs.map((leg, legIndex) => (
                      <div key={legIndex} className="space-y-1">
                        {leg.steps && leg.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-3 p-2 text-sm">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                              {stepIndex + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-900 dark:text-dark-text-primary">{step.instruction || 'Continue'}</div>
                              <div className="text-gray-500 dark:text-dark-text-muted text-xs mt-0.5">
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
