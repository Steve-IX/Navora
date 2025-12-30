import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Route } from '@shared/types/routing';
import { DirectionsList } from './DirectionsList';
import { useMapStore } from '@/stores/mapStore';
import { useLocationStore } from '@/stores/locationStore';
import { useRouteStore } from '@/stores/routeStore';
import { Coordinates } from '@shared/types/geocoding';

interface NavigationModeProps {
  route: Route;
  onExit: () => void;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const NavigationMode: React.FC<NavigationModeProps> = ({ route, onExit }) => {
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState<number | null>(null);
  const [isManuallyNavigating, setIsManuallyNavigating] = useState(false);
  const { setCenter, setZoom } = useMapStore();
  const { currentLocation, isTracking, setCurrentLocation, setIsTracking, setError: setLocationError } = useLocationStore();
  const { currentStepIndex, setCurrentStepIndex } = useRouteStore();
  const locationWatchId = useRef<number | null>(null);
  const stepCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const manualNavigationTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check if this is a flight route first
  const isFlightRoute = route.flightInfo !== undefined;

  // Calculate total steps - safely handle missing legs or steps
  const totalSteps = route.legs && Array.isArray(route.legs)
    ? route.legs.reduce((sum, leg) => {
        return sum + (leg?.steps && Array.isArray(leg.steps) ? leg.steps.length : 0);
      }, 0)
    : 0;

  // Get all steps in a flat array - safely handle missing data
  const getAllSteps = useCallback(() => {
    const allSteps: Array<{ step: any; legIndex: number; globalIndex: number }> = [];
    if (!route.legs || !Array.isArray(route.legs)) {
      return allSteps;
    }
    let globalIndex = 0;
    route.legs.forEach((leg, legIndex) => {
      if (leg && leg.steps && Array.isArray(leg.steps)) {
        leg.steps.forEach((step) => {
          allSteps.push({ step, legIndex, globalIndex: globalIndex++ });
        });
      }
    });
    return allSteps;
  }, [route.legs]);

  const allSteps = getAllSteps();
  const currentStep = allSteps[currentStepIndex] || null;
  const nextStep = currentStepIndex < allSteps.length - 1 ? allSteps[currentStepIndex + 1] : null;

  // Safe map centering function - wrapped in useCallback to prevent re-renders
  const centerOnLocation = useCallback((location: Coordinates, zoom: number = 16) => {
    // Use requestAnimationFrame to ensure we're not updating during render
    requestAnimationFrame(() => {
      try {
        setCenter(location);
        setZoom(zoom);
      } catch (error) {
        console.error('Error centering map:', error);
      }
    });
  }, [setCenter, setZoom]);

  // Center map on current step when step index changes (for Next/Previous navigation)
  useEffect(() => {
    if (currentStep?.step?.maneuver?.location && isManuallyNavigating) {
      setIsManuallyNavigating(true);
      centerOnLocation(currentStep.step.maneuver.location, 16);
      
      // Reset manual navigation flag after 3 seconds to allow auto-tracking to resume
      if (manualNavigationTimeout.current) {
        clearTimeout(manualNavigationTimeout.current);
      }
      manualNavigationTimeout.current = setTimeout(() => {
        setIsManuallyNavigating(false);
      }, 3000);
    }
  }, [currentStepIndex, currentStep, centerOnLocation, isManuallyNavigating]);

  // Start location tracking when navigation begins
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    if (!isTracking) {
      setIsTracking(true);
      try {
        locationWatchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: Coordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setCurrentLocation(newLocation);
            
            // Only auto-center if not manually navigating
            if (!isManuallyNavigating) {
              centerOnLocation(newLocation, 17);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied. Please enable location access.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out.';
                break;
            }
            setLocationError(errorMessage);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000, // Increased timeout for better reliability
          }
        );
      } catch (error) {
        console.error('Error setting up geolocation:', error);
        setLocationError('Failed to start location tracking');
      }
    }

    return () => {
      if (locationWatchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      if (manualNavigationTimeout.current) {
        clearTimeout(manualNavigationTimeout.current);
      }
    };
  }, [isTracking, setCurrentLocation, setIsTracking, setLocationError, centerOnLocation, isManuallyNavigating]);

  // Calculate distance to next turn and auto-advance steps
  useEffect(() => {
    if (!currentLocation || !currentStep) return;

    const updateDistanceAndCheckProximity = () => {
      if (!currentLocation || !currentStep) return;

      // Calculate distance to current step's maneuver point
      const stepLocation = currentStep.step.maneuver.location;
      const distance = calculateDistance(currentLocation, stepLocation);
      setDistanceToNextTurn(distance);

      // Auto-advance if user is within 30 meters of the step's maneuver point
      // or if they've completed more than 80% of the step's distance
      if (distance < 30 || (currentStep.step.distance > 0 && distance < currentStep.step.distance * 0.2)) {
        if (currentStepIndex < totalSteps - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        }
      }
    };

    // Update immediately
    updateDistanceAndCheckProximity();

    // Check every 2 seconds
    stepCheckInterval.current = setInterval(updateDistanceAndCheckProximity, 2000);

    return () => {
      if (stepCheckInterval.current) {
        clearInterval(stepCheckInterval.current);
      }
    };
  }, [currentLocation, currentStep, currentStepIndex, totalSteps, setCurrentStepIndex]);

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIndex = currentStepIndex + 1;
      setIsManuallyNavigating(true);
      setCurrentStepIndex(nextIndex);
      // Center map on next step's location
      const nextStepData = allSteps[nextIndex];
      if (nextStepData?.step?.maneuver?.location) {
        centerOnLocation(nextStepData.step.maneuver.location, 16);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setIsManuallyNavigating(true);
      setCurrentStepIndex(prevIndex);
      // Center map on previous step's location
      const prevStepData = allSteps[prevIndex];
      if (prevStepData?.step?.maneuver?.location) {
        centerOnLocation(prevStepData.step.maneuver.location, 16);
      }
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

  const getManeuverIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      depart: '▶',
      arrive: '◉',
      turn: '↪',
      'turn-left': '←',
      'turn-right': '→',
      'turn-sharp-left': '↰',
      'turn-sharp-right': '↱',
      'uturn-left': '↩',
      'uturn-right': '↪',
      straight: '↑',
      continue: '↑',
      'ramp-left': '↗',
      'ramp-right': '↖',
      merge: '⇄',
      'fork-left': '↰',
      'fork-right': '↱',
      'roundabout-left': '↺',
      'roundabout-right': '↻',
      new: '↑',
    };
    return iconMap[type.toLowerCase()] || '→';
  };

  if (isFlightRoute) {
    return (
      <FlightNavigationMode route={route} onExit={onExit} />
    );
  }

  // Calculate remaining distance and time
  let remainingDistance = 0;
  let remainingDuration = 0;
  for (let i = currentStepIndex; i < allSteps.length; i++) {
    remainingDistance += allSteps[i].step.distance;
    remainingDuration += allSteps[i].step.duration;
  }

  return (
    <>
      {/* Top Navigation Bar - Fixed at top, mobile responsive */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-auto">
        <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-blue-500/30">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                🧭
              </div>
              <div className="min-w-0">
                <div className="text-xs opacity-80">Navigating</div>
                <div className="text-xs sm:text-sm font-medium truncate">
                  {formatDistance(remainingDistance)} · {formatDuration(remainingDuration)}
                </div>
              </div>
            </div>
            <button
              onClick={onExit}
              className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
              aria-label="Exit navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Instruction - Prominent display, mobile optimized */}
          {currentStep && (
            <div className="px-3 sm:px-4 py-3 sm:py-4 bg-blue-700/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-xl flex-shrink-0">
                  {getManeuverIcon(currentStep.step.maneuver.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base sm:text-xl font-bold mb-1 truncate">
                    {currentStep.step.instruction}
                  </div>
                  {distanceToNextTurn !== null && (
                    <div className="text-sm sm:text-lg font-semibold opacity-90">
                      {formatDistance(distanceToNextTurn)}
                    </div>
                  )}
                  {nextStep && (
                    <div className="text-xs sm:text-sm opacity-75 mt-1 truncate">
                      Then: {nextStep.step.instruction}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step Progress Indicator - Mobile responsive */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-blue-800/30">
            <button
              onClick={handlePreviousStep}
              disabled={currentStepIndex === 0}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="text-xs sm:text-sm font-medium">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
            <button
              onClick={handleNextStep}
              disabled={currentStepIndex >= totalSteps - 1}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Next </span>→
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Steps Panel - Collapsible, mobile responsive */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <div className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[40vh] sm:max-h-[50vh] overflow-hidden flex flex-col">
          {/* Toggle Header */}
          <button
            onClick={() => setShowAllSteps(!showAllSteps)}
            className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              {showAllSteps ? 'Hide steps' : 'Show all steps'}
            </span>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showAllSteps ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Steps List */}
          {showAllSteps && (
            <div className="overflow-y-auto flex-1">
              <DirectionsList
                route={route}
                selectedStepIndex={currentStepIndex}
                onStepSelect={(index) => {
                  setIsManuallyNavigating(true);
                  setCurrentStepIndex(index);
                  const stepData = allSteps[index];
                  if (stepData?.step?.maneuver?.location) {
                    centerOnLocation(stepData.step.maneuver.location, 16);
                  }
                }}
                compact
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-center gap-3">
            <button
              onClick={onExit}
              className="px-6 py-2.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors shadow-lg"
            >
              End Navigation
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Separate Flight Navigation Component
const FlightNavigationMode: React.FC<{ route: Route; onExit: () => void }> = ({ route, onExit }) => {
  const { setCenter, setZoom } = useMapStore();

  const centerOnLocation = useCallback((location: Coordinates, zoom: number = 4) => {
    requestAnimationFrame(() => {
      try {
        setCenter(location);
        setZoom(zoom);
      } catch (error) {
        console.error('Error centering map:', error);
      }
    });
  }, [setCenter, setZoom]);

  useEffect(() => {
    // Center map to show the entire flight path
    if (route.geometry.coordinates.length >= 2) {
      const coords = route.geometry.coordinates;
      const midIndex = Math.floor(coords.length / 2);
      centerOnLocation(coords[midIndex], 4);
    }
  }, [route.geometry.coordinates, centerOnLocation]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  const formatDistance = (meters: number): string => {
    return `${(meters / 1000).toFixed(0)} km`;
  };

  return (
    <>
      {/* Flight Info Card - Top, mobile responsive */}
      <div className="fixed top-4 left-4 right-4 z-50 pointer-events-auto max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="text-2xl sm:text-3xl flex-shrink-0">✈️</span>
                <div className="min-w-0">
                  <div className="font-bold text-base sm:text-lg truncate">
                    {route.flightInfo!.airline} {route.flightInfo!.flightNumber || ''}
                  </div>
                  <div className="text-xs sm:text-sm opacity-90">
                    {formatDistance(route.distance)} · {formatDuration(route.duration)}
                  </div>
                </div>
              </div>
              <button
                onClick={onExit}
                className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Flight Route */}
          <div className="p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Departure */}
              <div className="flex-1 text-center min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {route.flightInfo!.departureIata || '---'}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 truncate">
                  {route.flightInfo!.departureAirport || 'Departure'}
                </div>
                {route.flightInfo!.scheduledDeparture && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(route.flightInfo!.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* Flight Path Visual */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div className="w-12 sm:w-16 h-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-red-500 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-base sm:text-lg">✈️</span>
                </div>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              </div>

              {/* Arrival */}
              <div className="flex-1 text-center min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {route.flightInfo!.arrivalIata || '---'}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 truncate">
                  {route.flightInfo!.arrivalAirport || 'Arrival'}
                </div>
                {route.flightInfo!.scheduledArrival && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(route.flightInfo!.scheduledArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {route.flightInfo!.flightStatus && (
              <div className="mt-4 flex justify-center">
                <span className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium ${
                  route.flightInfo!.flightStatus === 'active' ? 'bg-green-100 text-green-700' :
                  route.flightInfo!.flightStatus === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  route.flightInfo!.flightStatus === 'landed' ? 'bg-gray-100 text-gray-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {route.flightInfo!.flightStatus.charAt(0).toUpperCase() + route.flightInfo!.flightStatus.slice(1)}
                </span>
              </div>
            )}

            {/* Additional Info */}
            {route.flightInfo!.aircraft && (
              <div className="mt-3 text-center text-xs sm:text-sm text-gray-500">
                Aircraft: {route.flightInfo!.aircraft}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-center">
            <button
              onClick={onExit}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Close Flight Info
            </button>
          </div>
        </div>
      </div>

      {/* Flight Tips - Bottom, mobile responsive */}
      <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-auto max-w-lg mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-lg sm:text-xl flex-shrink-0">💡</span>
            <div className="text-xs sm:text-sm text-amber-800">
              <strong>Flight Route Info:</strong> This shows the direct flight path between airports. 
              For real-time flight tracking and booking, please use your airline's app or website.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavigationMode;
