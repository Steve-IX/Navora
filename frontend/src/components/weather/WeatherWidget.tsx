import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useWeatherStore } from '../../stores/weatherStore';
import { useLocationStore } from '../../stores/locationStore';
import { weatherService } from '../../services/api/weather.service';
import { WeatherIcon } from '../atoms/WeatherIcon';
import { TemperatureDisplay } from '../atoms/TemperatureDisplay';

interface WeatherWidgetProps {
  className?: string;
  onExpand?: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  className = '',
  onExpand,
}) => {
  const { currentWeather, isLoading, error, setWeather, setLoading, setError } =
    useWeatherStore();
  const { currentLocation } = useLocationStore();

  const fetchWeather = useCallback(async () => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const weather = await weatherService.getWeatherByCoordinates({
        lat: currentLocation.latitude,
        lon: currentLocation.longitude,
      });
      setWeather(weather);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load weather');
    }
  }, [currentLocation, setWeather, setLoading, setError]);

  useEffect(() => {
    if (currentLocation && !currentWeather && !isLoading) {
      fetchWeather();
    }
  }, [currentLocation, currentWeather, isLoading, fetchWeather]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!currentLocation) return;
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentLocation, fetchWeather]);

  // Error state
  if (error) {
    return (
      <div
        className={`
          bg-white dark:bg-dark-bg-secondary
          rounded-xl shadow-lg p-3
          border border-red-200 dark:border-red-800
          ${className}
        `}
      >
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchWeather}
          className="text-xs text-sky-500 hover:text-sky-600 mt-1"
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading || !currentWeather) {
    return (
      <div
        className={`
          bg-white dark:bg-dark-bg-secondary
          rounded-xl shadow-lg p-4
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="space-y-2">
            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      className={`
        bg-white dark:bg-dark-bg-secondary
        rounded-xl shadow-lg
        overflow-hidden cursor-pointer
        hover:shadow-xl transition-shadow
        ${className}
      `}
      onClick={onExpand}
    >
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Weather icon */}
          <div className="flex-shrink-0">
            <WeatherIcon
              condition={currentWeather.condition}
              isDay={currentWeather.isDay}
              size="lg"
            />
          </div>

          {/* Temperature and description */}
          <div className="flex-1 min-w-0">
            <TemperatureDisplay
              value={currentWeather.temperature}
              size="lg"
              className="text-slate-900 dark:text-white"
            />
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {currentWeather.description}
            </p>
          </div>

          {/* Refresh button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              fetchWeather();
            }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowPathIcon
              className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`}
            />
          </motion.button>
        </div>

        {/* Location info */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {currentWeather.location.name}, {currentWeather.location.country}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherWidget;
