import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  ArrowPathIcon,
  MapPinIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useWeatherStore } from '../../stores/weatherStore';
import { useLocationStore } from '../../stores/locationStore';
import { useUIStore } from '../../stores/uiStore';
import { weatherService } from '../../services/api/weather.service';
import { WeatherIcon } from '../atoms/WeatherIcon';
import { TemperatureDisplay } from '../atoms/TemperatureDisplay';

// Detail item component
interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon, label, value }) => (
  <motion.div
    className="bg-white/70 dark:bg-dark-bg-tertiary/70 backdrop-blur-md rounded-lg p-3 border border-white/40 dark:border-white/10"
    whileHover={{ y: -2 }}
    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
  >
    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-sm font-semibold text-slate-900 dark:text-white">
      {value}
    </p>
  </motion.div>
);

// Wind direction icon
const WindIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  </svg>
);

// Thermometer icon
const ThermometerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

// Droplet icon
const DropletIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

// Pressure icon
const PressureIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

// UV icon
const UVIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

export const WeatherPanel: React.FC = () => {
  const { currentWeather, isLoading, error, lastUpdated, setWeather, setLoading, setError } =
    useWeatherStore();
  const { currentLocation } = useLocationStore();
  const { setSidePanelContent } = useUIStore();

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

  const handleClose = () => {
    setSidePanelContent(null);
  };

  // Loading state
  if (isLoading && !currentWeather) {
    return (
      <div className="h-full bg-white dark:bg-dark-bg-secondary flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Weather</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400">Loading weather...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentWeather) {
    return (
      <div className="h-full bg-white dark:bg-dark-bg-secondary flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Weather</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchWeather}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWeather) {
    return null;
  }

  const detailItems = [
    {
      icon: <ThermometerIcon className="w-4 h-4" />,
      label: 'Feels Like',
      value: `${currentWeather.feelsLike}°C`,
    },
    {
      icon: <DropletIcon className="w-4 h-4" />,
      label: 'Humidity',
      value: `${currentWeather.humidity}%`,
    },
    {
      icon: <WindIcon className="w-4 h-4" />,
      label: 'Wind',
      value: `${currentWeather.windSpeed} km/h ${currentWeather.windDirection}`,
    },
    {
      icon: <EyeIcon className="w-4 h-4" />,
      label: 'Visibility',
      value: `${currentWeather.visibility} km`,
    },
    {
      icon: <PressureIcon className="w-4 h-4" />,
      label: 'Pressure',
      value: `${currentWeather.pressure} hPa`,
    },
    {
      icon: <UVIcon className="w-4 h-4" />,
      label: 'UV Index',
      value: currentWeather.uvIndex.toString(),
    },
  ];

  const detailContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const detailItem = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="h-full bg-white dark:bg-dark-bg-secondary flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/40 dark:border-white/10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Weather</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWeather}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowPathIcon
              className={`w-5 h-5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Location */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <MapPinIcon className="w-4 h-4" />
          <span className="font-medium">
            {currentWeather.location.name}, {currentWeather.location.country}
          </span>
        </div>

        {/* Main weather display */}
        <div className="bg-white/70 dark:bg-dark-bg-tertiary/70 backdrop-blur-md rounded-xl p-6 border border-white/40 dark:border-white/10">
          <div className="flex items-center gap-6">
            <WeatherIcon
              condition={currentWeather.condition}
              isDay={currentWeather.isDay}
              size="xl"
            />
            <div>
              <TemperatureDisplay
                value={currentWeather.temperature}
                size="xl"
                className="text-slate-900 dark:text-white"
              />
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-1">
                {currentWeather.description}
              </p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Details
          </h3>
          <motion.div
            className="grid grid-cols-2 gap-3"
            variants={detailContainer}
            initial="hidden"
            animate="show"
          >
            {detailItems.map((item, index) => (
              <motion.div key={index} variants={detailItem}>
                <DetailItem {...item} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Cloud cover */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Cloud Cover
          </h3>
          <div className="bg-white/70 dark:bg-dark-bg-tertiary/70 backdrop-blur-md rounded-lg p-3 border border-white/40 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Coverage</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {currentWeather.cloudCover}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
              <motion.div
                className="bg-sky-500 h-2 rounded-full transition-all"
                style={{ width: `${currentWeather.cloudCover}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${currentWeather.cloudCover}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default WeatherPanel;
