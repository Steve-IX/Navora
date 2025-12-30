import React, { useState } from 'react';
import { Route } from '@shared/types/routing';

interface DirectionsListProps {
  route: Route;
  selectedStepIndex?: number;
  onStepSelect?: (stepIndex: number, legIndex: number) => void;
  compact?: boolean;
}

export const DirectionsList: React.FC<DirectionsListProps> = ({
  route,
  selectedStepIndex,
  onStepSelect,
  compact = false,
}) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

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
      'straight': '↑',
      'ramp-left': '↗',
      'ramp-right': '↖',
      merge: '⇄',
      'fork-left': '↰',
      'fork-right': '↱',
      'roundabout-left': '↺',
      'roundabout-right': '↻',
      continue: '↑',
      new: '↑',
    };
    return iconMap[type.toLowerCase()] || '→';
  };

  const getTransportModeIcon = (mode?: string): string => {
    const iconMap: Record<string, string> = {
      walking: '🚶',
      driving: '🚗',
      transit: '🚌',
      flight: '✈️',
      transfer: '🔄',
    };
    return iconMap[mode || ''] || '→';
  };

  const getTransportModeColor = (mode?: string): string => {
    const colorMap: Record<string, string> = {
      walking: 'bg-green-100 text-green-700 border-green-300',
      driving: 'bg-blue-100 text-blue-700 border-blue-300',
      transit: 'bg-purple-100 text-purple-700 border-purple-300',
      flight: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      transfer: 'bg-orange-100 text-orange-700 border-orange-300',
    };
    return colorMap[mode || ''] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  let stepIndex = 0;
  const allSteps: { step: any; legIndex: number; globalIndex: number; leg?: any }[] = [];
  
  route.legs.forEach((leg, legIndex) => {
    leg.steps.forEach((step) => {
      allSteps.push({ step, legIndex, globalIndex: stepIndex++, leg });
    });
  });

  // Group legs by transport mode for visual separation
  const legGroups: Array<{ mode?: string; modeLabel?: string; legs: typeof route.legs }> = [];
  let currentGroup: typeof legGroups[0] | null = null;

  route.legs.forEach((leg) => {
    if (!currentGroup || currentGroup.mode !== leg.transportMode) {
      currentGroup = {
        mode: leg.transportMode,
        modeLabel: leg.modeLabel,
        legs: [leg],
      };
      legGroups.push(currentGroup);
    } else {
      currentGroup.legs.push(leg);
    }
  });

  // Compact mode - show minimal list
  if (compact) {
    return (
      <div className="divide-y divide-gray-100">
        {allSteps.map(({ step, legIndex, globalIndex }) => {
          const isSelected = selectedStepIndex === globalIndex;
          const isExpanded = expandedStep === globalIndex;
          
          return (
            <div
              key={globalIndex}
              className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <button
                onClick={() => {
                  setExpandedStep(isExpanded ? null : globalIndex);
                  onStepSelect?.(globalIndex, legIndex);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
              >
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-600 font-medium text-sm">
                  {getManeuverIcon(step.maneuver.type)}
                </span>
                <span className="flex-1 text-xs text-gray-800 truncate">
                  {step.instruction}
                </span>
                <span className="flex-shrink-0 text-xs text-gray-500">
                  {formatDistance(step.distance)}
                </span>
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-2 pl-10">
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Duration: {formatDuration(step.duration)}</div>
                    {step.name && <div>Road: {step.name}</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full mode - show detailed list with summary
  return (
    <div className="p-3">
      {/* Route Summary */}
      <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-2xl font-bold text-gray-900">{formatDuration(route.duration)}</div>
            <div className="text-sm text-gray-600">{formatDistance(route.distance)}</div>
          </div>
          <div className="text-right text-sm text-gray-500">
            {allSteps.length} steps
          </div>
        </div>
        
        {/* Transport Mode Chain */}
        {legGroups.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap text-xs">
            {legGroups.map((group, idx) => (
              <React.Fragment key={idx}>
                <span className={`px-2 py-1 rounded ${getTransportModeColor(group.mode)}`}>
                  {getTransportModeIcon(group.mode)} {group.modeLabel || group.mode || 'Travel'}
                </span>
                {idx < legGroups.length - 1 && <span className="text-gray-400">→</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Flight Info */}
        {route.flightInfo && (
          <div className="mt-2 pt-2 border-t border-blue-200">
            <div className="text-xs text-gray-600">
              <div className="font-medium">✈️ {route.flightInfo.departureAirport} ({route.flightInfo.departureIata})</div>
              <div className="text-gray-500">→ {route.flightInfo.arrivalAirport} ({route.flightInfo.arrivalIata})</div>
              {route.flightInfo.flightNumber && (
                <div className="text-gray-500 mt-1">
                  {route.flightInfo.airline} {route.flightInfo.flightNumber}
                </div>
              )}
              {route.flightInfo.transfers && route.flightInfo.transfers.length > 0 && (
                <div className="text-orange-600 mt-1">
                  {route.flightInfo.transfers.length} transfer{route.flightInfo.transfers.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Steps grouped by transport mode */}
      <div className="space-y-3">
        {legGroups.map((group, groupIndex) => {
          const groupSteps = allSteps.filter(({ legIndex }) => 
            route.legs[legIndex]?.transportMode === group.mode
          );
          const isTransfer = group.mode === 'transfer';
          
          return (
            <div key={groupIndex} className="space-y-1">
              {/* Mode separator */}
              {groupIndex > 0 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getTransportModeColor(group.mode)}`}>
                    {getTransportModeIcon(group.mode)} {group.modeLabel || group.mode || 'Continue'}
                  </div>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
              )}

              {groupSteps.map(({ step, legIndex, globalIndex, leg }) => {
                const isSelected = selectedStepIndex === globalIndex;
                const isExpanded = expandedStep === globalIndex;
                const isFirst = globalIndex === 0;
                const isLast = globalIndex === allSteps.length - 1;
                const stepMode = step.transportMode || leg?.transportMode;
                
                return (
                  <div
                    key={globalIndex}
                    className={`rounded-lg transition-all ${
                      isTransfer 
                        ? isSelected ? 'bg-orange-100 ring-2 ring-orange-400' : 'bg-orange-50 hover:bg-orange-100'
                        : isSelected ? 'bg-blue-100 ring-1 ring-blue-400' : 'hover:bg-gray-100'
                    }`}
                  >
              <button
                onClick={() => {
                  setExpandedStep(isExpanded ? null : globalIndex);
                  onStepSelect?.(globalIndex, legIndex);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left"
              >
                {/* Step indicator */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  {isTransfer ? (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-orange-500 text-white text-lg">
                      🔄
                    </div>
                  ) : stepMode === 'flight' ? (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-indigo-500 text-white text-lg">
                      ✈️
                    </div>
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : stepMode === 'driving' ? 'bg-blue-500' : stepMode === 'walking' ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                      {getManeuverIcon(step.maneuver.type)}
                    </div>
                  )}
                </div>

                {/* Instruction */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {step.instruction}
                  </div>
                  {!isExpanded && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDistance(step.distance)} · {formatDuration(step.duration)}
                    </div>
                  )}
                </div>

                {/* Expand indicator */}
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 pl-13 ml-10 border-l-2 border-blue-200">
                  <div className="text-xs text-gray-600 space-y-1 bg-white p-2 rounded">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Distance:</span>
                      <span className="font-medium">{formatDistance(step.distance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium">{formatDuration(step.duration)}</span>
                    </div>
                    {step.name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Road:</span>
                        <span className="font-medium truncate ml-2">{step.name}</span>
                      </div>
                    )}
                    {step.ref && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Route:</span>
                        <span className="font-medium">{step.ref}</span>
                      </div>
                    )}
                    {step.transferInfo && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Transfer at:</span>
                        <span className="font-medium">{step.transferInfo.airport}</span>
                      </div>
                    )}
                    {step.transferInfo?.layoverDuration && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Layover:</span>
                        <span className="font-medium">{formatDuration(step.transferInfo.layoverDuration)}</span>
                      </div>
                    )}
                    {stepMode && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mode:</span>
                        <span className="font-medium capitalize">{stepMode}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
