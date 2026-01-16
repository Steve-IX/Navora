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

  const hasAltitude = flight?.position?.altitude !== undefined && flight?.position?.altitude !== null;
  const hasSpeed = flight?.position?.groundSpeed !== undefined && flight?.position?.groundSpeed !== null;
  const hasHeading = flight?.position?.heading !== undefined && flight?.position?.heading !== null;
  const hasOrigin = flight?.origin?.iata || flight?.origin?.icao;
  const hasDestination = flight?.destination?.iata || flight?.destination?.icao;

  // FlightAware uses the callsign/ident in URLs, not the internal fa_flight_id
  // Extract just the flight identifier (e.g., "VIR23" from "VIR23-1234567-airline-123p")
  const getFlightAwareIdent = (): string | null => {
    // Prefer callsign as it's the public identifier
    if (flight?.callsign) {
      return flight.callsign;
    }
    // If we have flightNumber (IATA format like "VS23"), use it
    if (flight?.flightNumber) {
      return flight.flightNumber;
    }
    // Extract ident from fa_flight_id (format: "IDENT-timestamp-type-id")
    if (flight?.faFlightId) {
      const parts = flight.faFlightId.split('-');
      if (parts.length > 0 && parts[0]) {
        return parts[0];
      }
    }
    return null;
  };

  const flightIdent = getFlightAwareIdent();
  const flightAwareUrl = flightIdent
    ? `https://www.flightaware.com/live/flight/${flightIdent}`
    : null;

  // Determine if the flight is likely on ground (has status but no altitude/speed)
  const isOnGround = flight?.position?.isOnGround || 
    (flight?.status && !hasAltitude && !hasSpeed);

  return (
    <div
      className="absolute left-4 top-1/2 z-20 w-72 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/30 bg-white/70 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-200/50 bg-white/50 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Aircraft
        </span>
        <button
          onClick={onClose}
          className="ml-auto rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-200/50 hover:text-slate-600 dark:hover:bg-slate-700/50 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {error && !isLoading && (
          <div className="py-6 text-center text-sm text-red-500">{error}</div>
        )}

        {flight && !isLoading && !error && (
          <>
            {/* Callsign & Operator */}
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {flight.callsign || flight.flightNumber || 'Unknown'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {flight.operator?.name || flight.operator?.icao || 'Unknown Operator'}
              </p>
            </div>

            {/* Route */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-slate-800 dark:text-white">
                  {hasOrigin ? (flight.origin?.iata || flight.origin?.icao) : '—'}
                </div>
                {flight.origin?.city && (
                  <div className="truncate text-xs text-slate-500">{flight.origin.city}</div>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <div className="h-px w-6 bg-slate-300 dark:bg-slate-600" />
                <svg className="h-4 w-4 rotate-90" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                <div className="h-px w-6 bg-slate-300 dark:bg-slate-600" />
              </div>
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-slate-800 dark:text-white">
                  {hasDestination ? (flight.destination?.iata || flight.destination?.icao) : '—'}
                </div>
                {flight.destination?.city && (
                  <div className="truncate text-xs text-slate-500">{flight.destination.city}</div>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-100/80 px-3 py-2 text-center dark:bg-slate-800/50">
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Alt</div>
                <div className="text-sm font-bold text-slate-700 dark:text-white">
                  {hasAltitude ? formatNumber(flight.position?.altitude) : '—'}
                  {hasAltitude && <span className="ml-0.5 text-[10px] font-normal text-slate-400">ft</span>}
                </div>
              </div>
              <div className="rounded-xl bg-slate-100/80 px-3 py-2 text-center dark:bg-slate-800/50">
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Spd</div>
                <div className="text-sm font-bold text-slate-700 dark:text-white">
                  {hasSpeed ? formatNumber(flight.position?.groundSpeed) : '—'}
                  {hasSpeed && <span className="ml-0.5 text-[10px] font-normal text-slate-400">kts</span>}
                </div>
              </div>
              <div className="rounded-xl bg-slate-100/80 px-3 py-2 text-center dark:bg-slate-800/50">
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Hdg</div>
                <div className="text-sm font-bold text-slate-700 dark:text-white">
                  {hasHeading ? `${formatNumber(flight.position?.heading)}°` : '—'}
                </div>
              </div>
            </div>

            {/* Position */}
            {flight.position?.latitude !== undefined && flight.position?.longitude !== undefined && (
              <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">Position:</span>{' '}
                {flight.position.latitude.toFixed(4)}°, {flight.position.longitude.toFixed(4)}°
              </div>
            )}

            {/* Status */}
            {flight.status && (
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    flight.status.toLowerCase().includes('enroute') ||
                    flight.status.toLowerCase().includes('in air') ||
                    flight.status.toLowerCase().includes('airborne')
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                      : flight.status.toLowerCase().includes('landed') ||
                        flight.status.toLowerCase().includes('arrived')
                      ? 'bg-sky-500 shadow-lg shadow-sky-500/50'
                      : 'bg-amber-500 shadow-lg shadow-amber-500/50'
                  }`}
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {flight.status}
                </span>
              </div>
            )}

            {/* On Ground Notice */}
            {isOnGround && !hasAltitude && (
              <div className="mb-4 rounded-lg bg-slate-100/80 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50">
                Aircraft is on ground - flight data limited
              </div>
            )}

            {/* External Links */}
            {flightAwareUrl && (
              <div className="border-t border-slate-200/50 pt-3 dark:border-slate-700/50">
                <a
                  href={flightAwareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                  View on FlightAware
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
