import React from 'react';
import { LiveFlightDetails } from '@/types/liveFlights';

interface LiveFlightDetailsPanelProps {
  flight: LiveFlightDetails | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export const LiveFlightDetailsPanel: React.FC<LiveFlightDetailsPanelProps> = ({
  flight,
  isLoading,
  error,
  onClose,
}) => {
  if (!flight && !isLoading && !error) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 w-80 rounded-xl bg-white/95 p-4 shadow-xl backdrop-blur dark:bg-slate-900/95">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase text-slate-400">Flight details</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {flight?.operator?.name ?? 'Unknown operator'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {flight?.flightNumber ?? flight?.callsign ?? 'Unknown flight'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      {isLoading && (
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading flight details…</div>
      )}

      {error && !isLoading && (
        <div className="mt-3 text-sm text-red-500">{error}</div>
      )}

      {flight && !isLoading && !error && (
        <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex justify-between">
            <span>Route</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {(flight.origin?.iata || flight.origin?.icao || '---')} →
              {(flight.destination?.iata || flight.destination?.icao || '---')}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Altitude</span>
            <span>{flight.position?.altitude ?? '—'} ft</span>
          </div>
          <div className="flex justify-between">
            <span>Speed</span>
            <span>{flight.position?.groundSpeed ?? '—'} kts</span>
          </div>
          <div className="flex justify-between">
            <span>Heading</span>
            <span>{flight.position?.heading ?? '—'}°</span>
          </div>
          <div className="flex justify-between">
            <span>Latitude</span>
            <span>{flight.position?.latitude?.toFixed(4) ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Longitude</span>
            <span>{flight.position?.longitude?.toFixed(4) ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span>{flight.status ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Last update</span>
            <span>
              {flight.lastUpdatedUtc ? new Date(flight.lastUpdatedUtc).toUTCString() : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
