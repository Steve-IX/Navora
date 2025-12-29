import React, { useState, useEffect } from 'react';
import { useMapStore } from '@/stores/mapStore';

interface MeasurementToolProps {
  onClose: () => void;
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'distance' | 'area'>('distance');
  const { clearMarkers } = useMapStore();

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatArea = (squareMeters: number): string => {
    if (squareMeters < 10000) return `${Math.round(squareMeters)} m²`;
    if (squareMeters < 1000000) return `${(squareMeters / 10000).toFixed(2)} ha`;
    return `${(squareMeters / 1000000).toFixed(2)} km²`;
  };

  const handleClear = () => {
    clearMarkers();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
    };
  }, [clearMarkers]);

  return (
    <div className="absolute top-20 right-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Measurement Tool</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setMode('distance');
            handleClear();
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'distance'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Distance
        </button>
        <button
          onClick={() => {
            setMode('area');
            handleClear();
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'area'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Area
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        {mode === 'distance' ? (
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Distance</div>
            <div className="text-2xl font-bold text-gray-900">{formatDistance(0)}</div>
            <div className="text-xs text-gray-500 mt-1">Click on map to add points</div>
          </div>
        ) : (
          <div>
            <div className="text-sm text-gray-600 mb-1">Area</div>
            <div className="text-2xl font-bold text-gray-900">{formatArea(0)}</div>
            <div className="text-xs text-gray-500 mt-1">Click on map to add polygon points</div>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <strong>Note:</strong> Measurement functionality requires integration with map click handlers.
        This feature will be fully functional in a future update.
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
