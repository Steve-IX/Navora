import React, { useState } from 'react';
import { Route } from '@shared/types/routing';
import { DirectionsList } from './DirectionsList';
import { useMapStore } from '@/stores/mapStore';

interface NavigationModeProps {
  route: Route;
  onExit: () => void;
}

export const NavigationMode: React.FC<NavigationModeProps> = ({ route, onExit }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const { setCenter } = useMapStore();

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

  const handleStartNavigation = () => {
    setIsNavigating(true);
    // Center on first step
    if (route.legs[0]?.steps[0]?.maneuver?.location) {
      setCenter(route.legs[0].steps[0].maneuver.location);
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIndex(0);
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      // Center on next step location
      stepCount = 0;
      for (let legIndex = 0; legIndex < route.legs.length; legIndex++) {
        const leg = route.legs[legIndex];
        for (let stepIndex = 0; stepIndex < leg.steps.length; stepIndex++) {
          if (stepCount === currentStepIndex + 1) {
            if (leg.steps[stepIndex].maneuver?.location) {
              setCenter(leg.steps[stepIndex].maneuver.location);
            }
            break;
          }
          stepCount++;
        }
        if (stepCount > currentStepIndex) break;
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      // Center on previous step location
      stepCount = 0;
      for (let legIndex = 0; legIndex < route.legs.length; legIndex++) {
        const leg = route.legs[legIndex];
        for (let stepIndex = 0; stepIndex < leg.steps.length; stepIndex++) {
          if (stepCount === currentStepIndex - 1) {
            if (leg.steps[stepIndex].maneuver?.location) {
              setCenter(leg.steps[stepIndex].maneuver.location);
            }
            break;
          }
          stepCount++;
        }
        if (stepCount >= currentStepIndex - 1) break;
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
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={onExit}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Exit navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {currentStep && (
          <div className="mt-2">
            <div className="text-sm opacity-90">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
            <div className="text-lg font-semibold mt-1">{currentStep.step.instruction}</div>
          </div>
        )}
      </div>

      {/* Current Step Display (Large) */}
      {currentStep && (
        <div className="bg-blue-50 border-b border-blue-200 p-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{getManeuverIcon(currentStep.step.maneuver.type)}</div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {currentStep.step.instruction}
              </div>
              <div className="flex items-center gap-4 text-lg text-gray-600">
                <span>{formatDistance(currentStep.step.distance)}</span>
                <span>•</span>
                <span>{formatDuration(currentStep.step.duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handlePreviousStep}
            disabled={currentStepIndex === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            onClick={handleNextStep}
            disabled={currentStepIndex >= totalSteps - 1}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
        {!isNavigating ? (
          <button
            onClick={handleStartNavigation}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Start Navigation
          </button>
        ) : (
          <button
            onClick={handleStopNavigation}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Stop Navigation
          </button>
        )}
      </div>

      {/* Directions List */}
      <div className="flex-1 overflow-y-auto">
        <DirectionsList
          route={route}
          selectedStepIndex={currentStepIndex}
          onStepSelect={setCurrentStepIndex}
        />
      </div>
    </div>
  );
};

function getManeuverIcon(type: string): string {
  const iconMap: Record<string, string> = {
    depart: '🚀',
    arrive: '🏁',
    turn: '↪️',
    'turn-left': '↩️',
    'turn-right': '↪️',
    'turn-sharp-left': '⬅️',
    'turn-sharp-right': '➡️',
    'uturn-left': '↶',
    'uturn-right': '↷',
    'straight': '↑',
    'ramp-left': '↗️',
    'ramp-right': '↖️',
    merge: '⇄',
    'fork-left': '⤴️',
    'fork-right': '⤵️',
    'roundabout-left': '↺',
    'roundabout-right': '↻',
  };
  return iconMap[type.toLowerCase()] || '→';
}

