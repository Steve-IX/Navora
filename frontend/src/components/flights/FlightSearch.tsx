import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useFlightStore } from '../../stores/flightStore';
import { useUIStore } from '../../stores/uiStore';
import { flightsService } from '../../services/api/flights.service';
import { FlightCard } from './FlightCard';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const FlightSearch: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const debouncedInput = useDebounce(inputValue, 500);

  const {
    flights,
    isLoading,
    error,
    setFlights,
    setLoading,
    setError,
    clearFlights,
  } = useFlightStore();

  const { setSidePanelContent } = useUIStore();

  const searchFlights = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        clearFlights();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Detect if query looks like a flight number (e.g., AA123, BA456)
        const isFlightNumber = /^[A-Z]{2}\d{1,4}$/i.test(query.trim());

        const response = await flightsService.searchFlights(
          isFlightNumber
            ? { flightNumber: query.toUpperCase() }
            : { departureAirport: query.toUpperCase() }
        );

        setFlights(response.flights);
      } catch (err: any) {
        setError(
          err.response?.data?.message || err.message || 'Failed to search flights'
        );
      }
    },
    [setFlights, setLoading, setError, clearFlights]
  );

  // Search when debounced input changes
  useEffect(() => {
    if (debouncedInput) {
      searchFlights(debouncedInput);
    } else {
      clearFlights();
    }
  }, [debouncedInput, searchFlights, clearFlights]);

  const handleClear = () => {
    setInputValue('');
    clearFlights();
  };

  const handleClose = () => {
    setSidePanelContent(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full bg-white dark:bg-dark-bg-secondary flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
            <PaperAirplaneIcon className="w-5 h-5 text-white -rotate-45" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Flight Tracker
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Search flights worldwide
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Search input */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <motion.div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search flight number or airport (e.g., AA123, JFK)"
            className="
              w-full pl-10 pr-10 py-3
              bg-slate-50 dark:bg-dark-bg-tertiary
              border border-slate-200 dark:border-slate-700
              rounded-xl
              text-slate-900 dark:text-white
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent
              transition-all
            "
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <XMarkIcon className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Loading state */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-8"
          >
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <XMarkIcon className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => searchFlights(inputValue)}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Results list */}
        <AnimatePresence mode="wait">
          {!isLoading && !error && flights.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {flights.length} flight{flights.length !== 1 ? 's' : ''} found
              </p>
              {flights.map((flight, index) => (
                <FlightCard
                  key={`${flight.flightNumber}-${flight.departure.scheduled}-${index}`}
                  flight={flight}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when no results */}
        {!isLoading && !error && inputValue && flights.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <PaperAirplaneIcon className="w-6 h-6 text-slate-400 -rotate-45" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              No flights found
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              Try a different flight number or airport code
            </p>
          </motion.div>
        )}

        {/* Initial state */}
        {!isLoading && !inputValue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <PaperAirplaneIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 -rotate-45" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Search for flights
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 max-w-[240px] mx-auto">
              Enter a flight number (e.g., AA123) or airport code (e.g., JFK) to
              find flights
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default FlightSearch;
