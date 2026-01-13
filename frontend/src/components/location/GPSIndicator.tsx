import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPinIcon,
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useLocationStore } from '@/stores/locationStore';
import { useMapStore } from '@/stores/mapStore';
import { locationService } from '@/services/locationService';
import { Badge } from '@/components/atoms/Badge';
import { Tooltip } from '@/components/atoms/Tooltip';
import { IconButton } from '@/components/atoms/IconButton';

// Human-friendly accuracy labels
function getAccuracyInfo(meters: number | null): {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'default';
  description: string;
} {
  if (!meters) {
    return { label: 'Unknown', variant: 'default', description: 'Location accuracy unavailable' };
  }
  if (meters < 10) {
    return { label: 'Precise', variant: 'success', description: `Within ${Math.round(meters)}m` };
  }
  if (meters < 50) {
    return { label: 'Good', variant: 'success', description: `Within ${Math.round(meters)}m` };
  }
  if (meters < 100) {
    return { label: 'Moderate', variant: 'warning', description: `Within ${Math.round(meters)}m` };
  }
  if (meters < 500) {
    return { label: 'Approximate', variant: 'warning', description: `Within ${Math.round(meters)}m` };
  }
  return { label: 'Low accuracy', variant: 'error', description: `Within ${Math.round(meters)}m` };
}

export const GPSIndicator: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const {
    currentLocation,
    accuracy,
    speed,
    isTracking,
    error,
    setCurrentLocation,
    setAccuracy,
    setHeading,
    setSpeed,
    setIsTracking,
    setPermissionGranted,
    setError,
  } = useLocationStore();

  const { setCenter, setZoom } = useMapStore();

  const accuracyInfo = getAccuracyInfo(accuracy);

  useEffect(() => {
    // Auto-start tracking on mount (like Google Maps)
    handleStartTracking();
  }, []);

  useEffect(() => {
    // Check geolocation permission
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setPermissionGranted(result.state === 'granted');
          result.onchange = () => {
            setPermissionGranted(result.state === 'granted');
            // If permission is granted and we're not tracking, start tracking
            if (result.state === 'granted' && !isTracking) {
              handleStartTracking();
            }
          };
        })
        .catch(() => {
          // Permissions API might not be supported or query might fail
        });
    }
  }, [setPermissionGranted, isTracking]);

  const handleStartTracking = async () => {
    try {
      setError(null);
      const initialLocation = await locationService.getCurrentPosition();
      setCurrentLocation(initialLocation.coordinates);
      if (initialLocation.accuracy) setAccuracy(initialLocation.accuracy);
      if (initialLocation.heading) setHeading(initialLocation.heading);
      if (initialLocation.speed) setSpeed(initialLocation.speed);
      setPermissionGranted(true);

      setCenter(initialLocation.coordinates);
      setZoom(12);

      if (navigator.geolocation) {
        try {
          locationService.startTracking((location) => {
            setCurrentLocation(location.coordinates);
            setAccuracy(location.accuracy ?? null);
            setHeading(location.heading ?? null);
            setSpeed(location.speed ?? null);
          });
          setIsTracking(true);
        } catch (trackError) {
          console.warn('Failed to start continuous tracking:', trackError);
          setIsTracking(false);
        }
      } else {
        setIsTracking(false);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get location';
      setError(errorMessage);
      setPermissionGranted(false);
      setIsTracking(false);
      console.error('Location error:', err);
    }
  };

  const handleStopTracking = () => {
    locationService.stopTracking();
    setIsTracking(false);
  };

  const handleRecenter = () => {
    if (currentLocation) {
      setCenter(currentLocation);
      setZoom(12);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
      {/* Main indicator card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-elevation-2 dark:shadow-dark-md p-3 min-w-[200px]"
      >
        {/* Header with status */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            {/* Status dot */}
            <span className="relative flex h-2.5 w-2.5">
              {isTracking && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isTracking ? 'bg-success-500' : 'bg-gray-400 dark:bg-dark-text-muted'
                }`}
              />
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
              {isTracking ? 'Tracking' : 'Inactive'}
            </span>
          </div>

          {/* Info toggle button */}
          <Tooltip content={showDetails ? 'Hide details' : 'Show details'} position="left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
              aria-label={showDetails ? 'Hide location details' : 'Show location details'}
            >
              <InformationCircleIcon className="w-4 h-4 text-gray-500 dark:text-dark-text-muted" />
            </button>
          </Tooltip>
        </div>

        {/* Accuracy badge - human-friendly */}
        {currentLocation && (
          <div className="flex items-center gap-2">
            <Badge variant={accuracyInfo.variant} dot pulse={isTracking} size="md">
              {accuracyInfo.label} location
            </Badge>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-2 text-xs text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 px-2 py-1 rounded">
            {error}
          </div>
        )}

        {/* Expandable details */}
        <AnimatePresence>
          {showDetails && currentLocation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 mt-2 border-t border-gray-100 dark:border-dark-border-subtle space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-dark-text-muted">Latitude</span>
                  <span className="font-mono text-gray-700 dark:text-dark-text-secondary">
                    {currentLocation.latitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-dark-text-muted">Longitude</span>
                  <span className="font-mono text-gray-700 dark:text-dark-text-secondary">
                    {currentLocation.longitude.toFixed(6)}
                  </span>
                </div>
                {accuracy && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-dark-text-muted">Accuracy</span>
                    <span className="font-mono text-gray-700 dark:text-dark-text-secondary">
                      ±{Math.round(accuracy)}m
                    </span>
                  </div>
                )}
                {speed && speed > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-dark-text-muted">Speed</span>
                    <span className="font-mono text-gray-700 dark:text-dark-text-secondary">
                      {(speed * 3.6).toFixed(1)} km/h
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {!isTracking ? (
          <IconButton
            icon={<MapPinIcon className="w-5 h-5" />}
            onClick={handleStartTracking}
            tooltip="Start tracking"
            tooltipPosition="left"
            variant="primary"
            aria-label="Start location tracking"
          />
        ) : (
          <>
            <IconButton
              icon={<XMarkIcon className="w-5 h-5" />}
              onClick={handleStopTracking}
              tooltip="Stop tracking"
              tooltipPosition="left"
              variant="default"
              className="!bg-error-50 !text-error-600 hover:!bg-error-100 dark:!bg-error-900/20 dark:!text-error-400"
              aria-label="Stop location tracking"
            />
            <IconButton
              icon={<ArrowPathIcon className="w-5 h-5" />}
              onClick={handleRecenter}
              tooltip="Recenter map"
              tooltipPosition="left"
              variant="primary"
              aria-label="Recenter map on location"
            />
          </>
        )}
      </div>
    </div>
  );
};
