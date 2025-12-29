import React, { useState, useEffect } from 'react';
import { Route } from '@shared/types/routing';
import { DirectionsList } from './DirectionsList';
import { useMapStore } from '@/stores/mapStore';

interface NavigationModeProps {
  route: Route;
  onExit: () => void;
}

export const NavigationMode: React.FC<NavigationModeProps> = ({ route, onExit }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const { setCenter, setZoom } = useMapStore();

  // Calculate total steps
  const totalSteps = route.legs.reduce((sum, leg) => sum + leg.steps.length, 0);

  // Get current step
  let stepCount = 0;
  let currentStep: { step: any; legIndex: number } | null = null;
  for (let legIndex = 0; legIndex < route.legs.length; legIndex++) {
    const leg = route.legs[legIndex];
    for (let stepIndex = 0; stepIndex < leg.steps.length; stepIndex++) {
      if (stepCount === currentStepIndex) {
        currentStep = { step: leg.steps[stepIndex], legIndex };
        break;
      }
      stepCount++;
    }
    if (currentStep) break;
  }

  // Auto-center on current step
  useEffect(() => {
    if (currentStep?.step?.maneuver?.location) {
      setCenter(currentStep.step.maneuver.location);
      setZoom(16);
    }
  }, [currentStepIndex]);

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
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

  // Check if this is a flight route
  const isFlightRoute = route.flightInfo !== undefined;

  if (isFlightRoute) {
    return (
      <FlightNavigationMode route={route} onExit={onExit} />
    );
  }

  return (
    <>
      {/* Top Navigation Bar - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-auto">
        <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-lg">
      {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">
                🧭
              </div>
              <div>
                <div className="text-xs opacity-80">Navigating</div>
                <div className="text-sm font-medium">
                  {formatDistance(route.distance)} · {formatDuration(route.duration)}
                </div>
              </div>
            </div>
          <button
            onClick={onExit}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Exit navigation"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
      </div>

          {/* Current Instruction */}
      {currentStep && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg">
                  {getManeuverIcon(currentStep.step.maneuver.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold truncate">
                {currentStep.step.instruction}
              </div>
                  <div className="text-sm opacity-80">
                    {formatDistance(currentStep.step.distance)} · {formatDuration(currentStep.step.duration)}
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Step Controls */}
          <div className="flex items-center justify-between px-4 py-2 bg-blue-800/30">
          <button
            onClick={handlePreviousStep}
            disabled={currentStepIndex === 0}
              className="px-3 py-1.5 text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
              ← Previous
          </button>
            <div className="text-sm">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
          <button
            onClick={handleNextStep}
            disabled={currentStepIndex >= totalSteps - 1}
              className="px-3 py-1.5 text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
              Next →
          </button>
          </div>
        </div>
      </div>

      {/* Bottom Steps Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <div className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[40vh] overflow-hidden flex flex-col">
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
          onStepSelect={setCurrentStepIndex}
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
  const flightInfo = route.flightInfo!;

  useEffect(() => {
    // Center map to show the entire flight path
    if (route.geometry.coordinates.length >= 2) {
      const coords = route.geometry.coordinates;
      const midIndex = Math.floor(coords.length / 2);
      setCenter(coords[midIndex]);
      setZoom(4); // Zoom out for flight view
    }
  }, []);

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
      {/* Flight Info Card - Top */}
      <div className="fixed top-4 left-4 right-4 z-50 pointer-events-auto max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✈️</span>
                <div>
                  <div className="font-bold text-lg">
                    {flightInfo.airline} {flightInfo.flightNumber || ''}
                  </div>
                  <div className="text-sm opacity-90">
                    {formatDistance(route.distance)} · {formatDuration(route.duration)}
                  </div>
                </div>
              </div>
              <button
                onClick={onExit}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Flight Route */}
          <div className="p-4">
            <div className="flex items-center gap-4">
              {/* Departure */}
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {flightInfo.departureIata || '---'}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {flightInfo.departureAirport || 'Departure'}
                </div>
                {flightInfo.scheduledDeparture && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(flightInfo.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* Flight Path Visual */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div className="w-16 h-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-red-500 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">✈️</span>
                </div>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              </div>

              {/* Arrival */}
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {flightInfo.arrivalIata || '---'}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {flightInfo.arrivalAirport || 'Arrival'}
                </div>
                {flightInfo.scheduledArrival && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(flightInfo.scheduledArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {flightInfo.flightStatus && (
              <div className="mt-4 flex justify-center">
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                  flightInfo.flightStatus === 'active' ? 'bg-green-100 text-green-700' :
                  flightInfo.flightStatus === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  flightInfo.flightStatus === 'landed' ? 'bg-gray-100 text-gray-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {flightInfo.flightStatus.charAt(0).toUpperCase() + flightInfo.flightStatus.slice(1)}
                </span>
              </div>
            )}

            {/* Additional Info */}
            {flightInfo.aircraft && (
              <div className="mt-3 text-center text-sm text-gray-500">
                Aircraft: {flightInfo.aircraft}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-center">
            <button
              onClick={onExit}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Close Flight Info
            </button>
          </div>
        </div>
      </div>

      {/* Flight Tips - Bottom */}
      <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-auto max-w-lg mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-amber-800">
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
