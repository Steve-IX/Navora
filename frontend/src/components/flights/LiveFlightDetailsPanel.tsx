import React, { useMemo } from 'react';
import { LiveFlightDetails } from '@/types/liveFlights';

interface LiveFlightDetailsPanelProps {
  flight: LiveFlightDetails | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

// Airline ICAO to display name mapping
const AIRLINE_NAMES: Record<string, string> = {
  AAL: 'American Airlines',
  BAW: 'British Airways',
  DAL: 'Delta Air Lines',
  UAL: 'United Airlines',
  SWA: 'Southwest Airlines',
  VIR: 'Virgin Atlantic',
  AFR: 'Air France',
  DLH: 'Lufthansa',
  KLM: 'KLM Royal Dutch',
  EZY: 'easyJet',
  RYR: 'Ryanair',
  UAE: 'Emirates',
  QTR: 'Qatar Airways',
  SIA: 'Singapore Airlines',
  CPA: 'Cathay Pacific',
  ANA: 'All Nippon Airways',
  JAL: 'Japan Airlines',
  QFA: 'Qantas',
  THY: 'Turkish Airlines',
  IBE: 'Iberia',
  TAP: 'TAP Air Portugal',
  SAS: 'Scandinavian Airlines',
  FIN: 'Finnair',
  ACA: 'Air Canada',
  ETD: 'Etihad Airways',
};

// Status color and text mapping
const getStatusInfo = (status?: string) => {
  if (!status) return { color: 'bg-slate-400', text: 'Unknown', textColor: 'text-slate-600' };
  const s = status.toLowerCase();
  if (s.includes('enroute') || s.includes('in air') || s.includes('airborne') || s.includes('en route')) {
    return { color: 'bg-emerald-500', text: 'En Route', textColor: 'text-emerald-600', glow: 'shadow-emerald-500/50' };
  }
  if (s.includes('landed') || s.includes('arrived') || s.includes('gate arrival')) {
    return { color: 'bg-sky-500', text: 'Arrived', textColor: 'text-sky-600', glow: 'shadow-sky-500/50' };
  }
  if (s.includes('delayed')) {
    return { color: 'bg-amber-500', text: 'Delayed', textColor: 'text-amber-600', glow: 'shadow-amber-500/50' };
  }
  if (s.includes('cancelled')) {
    return { color: 'bg-red-500', text: 'Cancelled', textColor: 'text-red-600', glow: 'shadow-red-500/50' };
  }
  if (s.includes('scheduled') || s.includes('filed')) {
    return { color: 'bg-indigo-500', text: 'Scheduled', textColor: 'text-indigo-600', glow: 'shadow-indigo-500/50' };
  }
  if (s.includes('taxiing') || s.includes('taxi')) {
    return { color: 'bg-yellow-500', text: 'Taxiing', textColor: 'text-yellow-600', glow: 'shadow-yellow-500/50' };
  }
  return { color: 'bg-slate-400', text: status, textColor: 'text-slate-600' };
};

export const LiveFlightDetailsPanel: React.FC<LiveFlightDetailsPanelProps> = ({
  flight,
  isLoading,
  error,
  onClose,
}) => {
  if (!flight && !isLoading && !error) {
    return null;
  }

  // Compute flight progress and times
  const flightProgress = useMemo(() => {
    if (!flight) return null;
    
    const departureTime = flight.actual?.off || flight.estimated?.off || flight.scheduled?.off;
    const arrivalTime = flight.actual?.on || flight.estimated?.on || flight.scheduled?.on;
    
    if (!departureTime || !arrivalTime) return null;
    
    const dep = new Date(departureTime).getTime();
    const arr = new Date(arrivalTime).getTime();
    const now = Date.now();
    
    if (dep >= arr) return null;
    
    const totalDuration = arr - dep;
    const elapsed = Math.max(0, now - dep);
    const remaining = Math.max(0, arr - now);
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    
    return {
      progress,
      elapsed,
      remaining,
      totalDuration,
      departureTime: dep,
      arrivalTime: arr,
      isComplete: progress >= 100,
    };
  }, [flight]);

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (isoString?: string): string => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    } catch {
      return '—';
    }
  };

  const formatNumber = (num: number | undefined | null, decimals = 0): string => {
    if (num === undefined || num === null) return '—';
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
  };

  // Get airline display name
  const getAirlineName = (): string => {
    if (flight?.operator?.name) return flight.operator.name;
    const icao = flight?.operator?.icao || flight?.callsign?.substring(0, 3);
    if (icao && AIRLINE_NAMES[icao]) return AIRLINE_NAMES[icao];
    return flight?.operator?.icao || 'Unknown Airline';
  };

  // Get flight codes
  const getFlightCodes = (): string => {
    const codes: string[] = [];
    if (flight?.callsign) codes.push(flight.callsign);
    if (flight?.flightNumber && flight.flightNumber !== flight.callsign) {
      codes.push(flight.flightNumber);
    }
    return codes.join(' / ') || 'Unknown';
  };

  // FlightAware URL using callsign or flight number
  const getFlightIdent = (): string | null => {
    if (flight?.callsign) return flight.callsign;
    if (flight?.flightNumber) return flight.flightNumber;
    return null;
  };

  const flightIdent = getFlightIdent();
  const flightAwareUrl = flightIdent
    ? `https://www.flightaware.com/live/flight/${flightIdent}`
    : null;

  const statusInfo = getStatusInfo(flight?.status);
  const hasPosition = flight?.position?.altitude !== undefined || flight?.position?.groundSpeed !== undefined;
  const isOnGround = flight?.position?.isOnGround || (!hasPosition && flight?.status?.toLowerCase().includes('arrived'));

  return (
    <div
      className="absolute left-4 top-1/2 z-20 w-80 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with status indicator */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-white px-4 py-3 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Airline icon placeholder */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {getAirlineName()}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {getFlightCodes()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-200/50 hover:text-slate-600 dark:hover:bg-slate-700/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status badge */}
        {flight && (
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusInfo.color} shadow-lg ${statusInfo.glow || ''}`} />
            <span className={`text-sm font-semibold uppercase tracking-wide ${statusInfo.textColor}`}>
              {statusInfo.text}
            </span>
            {flightProgress && !flightProgress.isComplete && flightProgress.remaining > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                · {formatDuration(flightProgress.remaining)} remaining
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-6 text-center">
          <div className="mb-2 text-red-500">
            <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Flight details */}
      {flight && !isLoading && !error && (
        <div className="p-4">
          {/* Route section */}
          <div className="mb-4 rounded-xl bg-slate-50/80 p-4 dark:bg-slate-800/50">
            <div className="flex items-stretch justify-between">
              {/* Origin */}
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-slate-800 dark:text-white">
                  {flight.origin?.iata || flight.origin?.icao || '—'}
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {flight.origin?.city || flight.origin?.name || 'Unknown'}
                </div>
                {flight.gate?.origin && (
                  <div className="mt-1 text-xs text-slate-400">Gate {flight.gate.origin}</div>
                )}
                {flight.scheduled?.off && (
                  <div className="mt-1 text-xs text-slate-500">
                    {formatTime(flight.actual?.off || flight.scheduled.off)}
                  </div>
                )}
              </div>

              {/* Flight path indicator */}
              <div className="flex flex-1 flex-col items-center justify-center px-2">
                <div className="relative flex w-full items-center">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700" />
                  <div className="relative mx-1">
                    <svg className="h-5 w-5 rotate-90 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                  </div>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
                </div>
                {flightProgress && (
                  <div className="mt-1 text-[10px] text-slate-400">
                    {formatDuration(flightProgress.totalDuration)}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-slate-800 dark:text-white">
                  {flight.destination?.iata || flight.destination?.icao || '—'}
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {flight.destination?.city || flight.destination?.name || 'Unknown'}
                </div>
                {flight.gate?.destination && (
                  <div className="mt-1 text-xs text-slate-400">Gate {flight.gate.destination}</div>
                )}
                {flight.scheduled?.on && (
                  <div className="mt-1 text-xs text-slate-500">
                    {formatTime(flight.estimated?.on || flight.scheduled.on)}
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {flightProgress && !isOnGround && (
              <div className="mt-4">
                <div className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-1000"
                    style={{ width: `${flightProgress.progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-lg"
                    style={{ left: `calc(${flightProgress.progress}% - 6px)` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                  <span>{formatDuration(flightProgress.elapsed)} elapsed</span>
                  <span>{formatDuration(flightProgress.remaining)} to go</span>
                </div>
              </div>
            )}
          </div>

          {/* Live telemetry - only show for in-flight */}
          {hasPosition && !isOnGround && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 p-3 text-center dark:from-sky-900/30 dark:to-blue-900/30">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Altitude
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800 dark:text-white">
                  {formatNumber(flight.position?.altitude)}
                </div>
                <div className="text-[10px] text-slate-400">feet</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-3 text-center dark:from-emerald-900/30 dark:to-green-900/30">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Speed
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800 dark:text-white">
                  {formatNumber(flight.position?.groundSpeed)}
                </div>
                <div className="text-[10px] text-slate-400">knots</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 p-3 text-center dark:from-violet-900/30 dark:to-purple-900/30">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Heading
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800 dark:text-white">
                  {formatNumber(flight.position?.heading)}°
                </div>
                <div className="text-[10px] text-slate-400">degrees</div>
              </div>
            </div>
          )}

          {/* Aircraft info */}
          {flight.aircraft && (flight.aircraft.type || flight.aircraft.registration) && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Aircraft</span>
              </div>
              <div className="text-right">
                {flight.aircraft.type && (
                  <div className="text-sm font-semibold text-slate-800 dark:text-white">
                    {flight.aircraft.type}
                  </div>
                )}
                {flight.aircraft.registration && (
                  <div className="text-xs text-slate-400">{flight.aircraft.registration}</div>
                )}
              </div>
            </div>
          )}

          {/* On ground notice */}
          {isOnGround && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-3 dark:bg-sky-900/30">
              <svg className="h-4 w-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-sky-700 dark:text-sky-300">
                Aircraft is on ground — live telemetry unavailable
              </span>
            </div>
          )}

          {/* Position coordinates */}
          {flight.position?.latitude !== undefined && flight.position?.longitude !== undefined && (
            <div className="mb-4 text-center text-xs text-slate-400">
              {flight.position.latitude.toFixed(4)}°N, {flight.position.longitude.toFixed(4)}°W
            </div>
          )}

          {/* FlightAware link */}
          {flightAwareUrl && (
            <a
              href={flightAwareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              View Full Details on FlightAware
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {/* Last updated */}
          {flight.lastUpdatedUtc && (
            <div className="mt-3 text-center text-[10px] text-slate-400">
              Updated {new Date(flight.lastUpdatedUtc).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
