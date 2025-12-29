import React from 'react';
import { Route } from '@shared/types/routing';

interface DirectionsListProps {
  route: Route;
  selectedStepIndex?: number;
  onStepSelect?: (stepIndex: number, legIndex: number) => void;
}

export const DirectionsList: React.FC<DirectionsListProps> = ({
  route,
  selectedStepIndex,
  onStepSelect,
}) => {
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

  const getManeuverIcon = (type: string): string => {
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
  };

  let stepIndex = 0;

  return (
    <div className="p-4">
      {/* Route Summary */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-gray-900">Distance:</span>
          <span className="text-lg font-bold text-gray-900">{formatDistance(route.distance)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Duration:</span>
          <span className="text-lg font-bold text-gray-900">{formatDuration(route.duration)}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {route.legs.map((leg, legIndex) => (
          <div key={legIndex} className="space-y-2">
            {leg.steps.map((step, idx) => {
              const currentStepIndex = stepIndex++;
              const isSelected = selectedStepIndex === currentStepIndex;
              
              return (
                <div
                  key={idx}
                  onClick={() => onStepSelect?.(currentStepIndex, legIndex)}
                  className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary-50 border-primary-500'
                      : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getManeuverIcon(step.maneuver.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 mb-1">{step.instruction}</div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatDistance(step.distance)}</span>
                        <span>•</span>
                        <span>{formatDuration(step.duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

