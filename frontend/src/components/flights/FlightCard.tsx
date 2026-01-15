import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { FlightData, useFlightStore } from '../../stores/flightStore';
import { FlightStatusBadge } from '../atoms/FlightStatusBadge';

interface FlightCardProps {
  flight: FlightData;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight }) => {
  const { selectFlight, selectedFlight } = useFlightStore();
  const isSelected = selectedFlight?.flightNumber === flight.flightNumber;

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '--:--';
    }
  };

  const handleClick = () => {
    selectFlight(isSelected ? null : flight);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      layout
      onClick={handleClick}
      className={`
        bg-white dark:bg-dark-bg-tertiary
        rounded-xl p-4 cursor-pointer
        border-2 transition-all
        ${
          isSelected
            ? 'border-sky-500 shadow-lg shadow-sky-500/20'
            : 'border-transparent shadow-sm hover:shadow-md'
        }
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PaperAirplaneIcon className="w-4 h-4 text-sky-500 -rotate-45" />
          <span className="font-bold text-slate-900 dark:text-white">
            {flight.flightNumber}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {flight.airline.name}
          </span>
        </div>
        <FlightStatusBadge status={flight.status} />
      </div>

      {/* Route display */}
      <div className="flex items-center justify-between">
        {/* Departure */}
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {flight.departure.iata || '---'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
            {flight.departure.airport}
          </p>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-1">
            {formatTime(flight.departure.scheduled)}
          </p>
        </div>

        {/* Arrow and status */}
        <div className="flex-1 px-4 flex flex-col items-center">
          <div className="w-full flex items-center">
            <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600" />
            <PaperAirplaneIcon className="w-4 h-4 text-slate-400 mx-2 -rotate-45" />
            <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600" />
          </div>
          {flight.live && (
            <span className="text-xs text-sky-500 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
              Live tracking
            </span>
          )}
        </div>

        {/* Arrival */}
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {flight.arrival.iata || '---'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
            {flight.arrival.airport}
          </p>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-1">
            {formatTime(flight.arrival.scheduled)}
          </p>
        </div>
      </div>

      {/* Terminal/Gate info */}
      {(flight.departure.terminal || flight.departure.gate) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-4 text-sm">
          {flight.departure.terminal && (
            <span className="text-slate-500 dark:text-slate-400">
              Terminal:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {flight.departure.terminal}
              </span>
            </span>
          )}
          {flight.departure.gate && (
            <span className="text-slate-500 dark:text-slate-400">
              Gate:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {flight.departure.gate}
              </span>
            </span>
          )}
        </div>
      )}

      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2 text-sm"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Status</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                {flight.status || 'unknown'}
              </span>
            </div>
            {(flight.arrival.terminal || flight.arrival.gate) && (
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Arrival Gate</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {flight.arrival.terminal ? `T${flight.arrival.terminal}` : '--'}
                  {flight.arrival.gate ? ` • Gate ${flight.arrival.gate}` : ''}
                </span>
              </div>
            )}
            {flight.aircraft?.registration && (
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Aircraft</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {flight.aircraft.registration}
                </span>
              </div>
            )}
            {flight.live && (
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Live Position</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {flight.live.latitude.toFixed(2)}, {flight.live.longitude.toFixed(2)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FlightCard;
