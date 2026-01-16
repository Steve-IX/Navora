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

  const formatNumber = (num: number | undefined | null, decimals = 0): string => {
    if (num === undefined || num === null) return '—';
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
  };

  const flightAwareUrl = flight?.faFlightId
    ? `https://flightaware.com/live/flight/${flight.faFlightId}`
    : flight?.callsign
    ? `https://flightaware.com/live/flight/${flight.callsign}`
    : null;

  const fr24Url = flight?.callsign
    ? `https://www.flightradar24.com/${flight.callsign.toLowerCase()}`
    : null;

  return (
    <div
      className="absolute left-4 top-1/2 z-20 w-72 -translate-y-1/2 overflow-hidden rounded-lg bg-slate-800/95 shadow-2xl backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-900/80 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
          Aircraft
        </span>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {error && !isLoading && (
          <div className="py-4 text-center text-sm text-red-400">{error}</div>
        )}

        {flight && !isLoading && !error && (
          <>
            {/* Callsign & Operator */}
            <div className="mb-3">
              <h3 className="text-xl font-bold text-white">
                {flight.callsign || flight.flightNumber || 'Unknown'}
              </h3>
              <p className="text-sm text-slate-400">
                {flight.operator?.name || 'Unknown Operator'}
              </p>
            </div>

            {/* Route */}
            {(flight.origin || flight.destination) && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="font-medium text-white">
                  {flight.origin?.iata || flight.origin?.icao || '???'}
                </span>
                <span className="text-slate-500">→</span>
                <span className="font-medium text-white">
                  {flight.destination?.iata || flight.destination?.icao || '???'}
                </span>
              </div>
            )}

            {/* Stats Row */}
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-slate-700/50 px-2 py-1.5">
                <div className="text-xs text-slate-400">Alt</div>
                <div className="text-sm font-semibold text-white">
                  {formatNumber(flight.position?.altitude)} <span className="text-xs text-slate-400">ft</span>
                </div>
              </div>
              <div className="rounded bg-slate-700/50 px-2 py-1.5">
                <div className="text-xs text-slate-400">Spd</div>
                <div className="text-sm font-semibold text-white">
                  {formatNumber(flight.position?.groundSpeed)} <span className="text-xs text-slate-400">kts</span>
                </div>
              </div>
              <div className="rounded bg-slate-700/50 px-2 py-1.5">
                <div className="text-xs text-slate-400">Hdg</div>
                <div className="text-sm font-semibold text-white">
                  {formatNumber(flight.position?.heading)}°
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="mb-3 text-xs text-slate-400">
              {flight.position?.latitude?.toFixed(4) ?? '—'}°,{' '}
              {flight.position?.longitude?.toFixed(4) ?? '—'}°
            </div>

            {/* Status */}
            {flight.status && (
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    flight.status.toLowerCase().includes('enroute') ||
                    flight.status.toLowerCase().includes('in air')
                      ? 'bg-emerald-500'
                      : flight.status.toLowerCase().includes('landed') ||
                        flight.status.toLowerCase().includes('arrived')
                      ? 'bg-sky-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="text-sm text-slate-300">{flight.status}</span>
              </div>
            )}

            {/* External Links */}
            <div className="flex gap-2 border-t border-slate-700 pt-3">
              {fr24Url && (
                <a
                  href={fr24Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-500"
                >
                  FR24 ↗
                </a>
              )}
              {flightAwareUrl && (
                <a
                  href={flightAwareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-sky-500"
                >
                  FlightAware ↗
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
