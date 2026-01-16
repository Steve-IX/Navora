import React from 'react';
import { useLiveFlightStore } from '@/stores/liveFlightStore';

export const LiveFlightControls: React.FC = () => {
  const {
    enabled,
    filters,
    setEnabled,
    updateFilters,
    lastUpdatedUtc,
    stale,
    isLoading,
    error,
  } = useLiveFlightStore();

  return (
    <div className="absolute bottom-24 right-4 z-10 w-72 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur dark:bg-slate-900/95">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Live Flights</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lastUpdatedUtc ? `Updated ${new Date(lastUpdatedUtc).toLocaleTimeString()}` : 'Not active'}
            {stale ? ' (stale)' : ''}
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            enabled
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200'
          }`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <input
            value={filters.airline ?? ''}
            onChange={(event) => updateFilters({ airline: event.target.value || undefined })}
            placeholder="Airline (ICAO/IATA or name)"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={filters.minAltitude ?? ''}
            onChange={(event) =>
              updateFilters({ minAltitude: event.target.value ? Number(event.target.value) : undefined })
            }
            placeholder="Min alt"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="number"
            value={filters.maxAltitude ?? ''}
            onChange={(event) =>
              updateFilters({ maxAltitude: event.target.value ? Number(event.target.value) : undefined })
            }
            placeholder="Max alt"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={filters.minSpeed ?? ''}
            onChange={(event) =>
              updateFilters({ minSpeed: event.target.value ? Number(event.target.value) : undefined })
            }
            placeholder="Min kts"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="number"
            value={filters.maxSpeed ?? ''}
            onChange={(event) =>
              updateFilters({ maxSpeed: event.target.value ? Number(event.target.value) : undefined })
            }
            placeholder="Max kts"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <input
          value={filters.destinationCountry ?? ''}
          onChange={(event) =>
            updateFilters({ destinationCountry: event.target.value || undefined })
          }
          placeholder="Destination country (code)"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
        />
        {isLoading && enabled && (
          <div className="text-xs text-slate-500 dark:text-slate-400">Loading live data…</div>
        )}
        {error && !isLoading && (
          <div className="text-xs text-red-500">{error}</div>
        )}
      </div>
    </div>
  );
};
