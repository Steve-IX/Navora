import { useEffect } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { useMapStore } from '@/stores/mapStore';
import { locationService } from '@/services/locationService';

export const GPSIndicator: React.FC = () => {
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
          // This is okay, we'll handle it when user clicks the button
        });
    }
  }, [setPermissionGranted, isTracking]);

  const handleStartTracking = async () => {
    try {
      setError(null);
      // Request current position first (will use IP geolocation as fallback)
      const initialLocation = await locationService.getCurrentPosition();
      setCurrentLocation(initialLocation.coordinates);
      if (initialLocation.accuracy) setAccuracy(initialLocation.accuracy);
      if (initialLocation.heading) setHeading(initialLocation.heading);
      if (initialLocation.speed) setSpeed(initialLocation.speed);
      setPermissionGranted(true);

      // Center map on location
      setCenter(initialLocation.coordinates);
      setZoom(12); // Zoom in when we have a specific location

      // Only start continuous tracking if browser geolocation is supported
      // IP geolocation doesn't support watchPosition
      if (navigator.geolocation) {
        try {
          locationService.startTracking((location) => {
            setCurrentLocation(location.coordinates);
            setAccuracy(location.accuracy ?? null);
            setHeading(location.heading ?? null);
            setSpeed(location.speed ?? null);
            // MapView will automatically update the visual indicator
          });
          setIsTracking(true);
        } catch (trackError) {
          // Tracking failed, but we still have the initial location
          console.warn('Failed to start continuous tracking:', trackError);
          setIsTracking(false);
        }
      } else {
        // Browser geolocation not supported, just use the IP-based location
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
    // MapView will automatically remove the visual indicator when isTracking is false
  };

  const handleRecenter = () => {
    if (currentLocation) {
      setCenter(currentLocation);
      setZoom(12);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
      <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-3">
        <div className="flex flex-col items-center">
          <div
            className={`w-3 h-3 rounded-full ${
              isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
            aria-label={isTracking ? 'Location tracking active' : 'Location tracking inactive'}
          />
          {error && (
            <div className="text-xs text-red-600 mt-1 max-w-32 text-center">{error}</div>
          )}
        </div>
        <div className="flex flex-col text-sm">
          {currentLocation && (
            <>
              <div className="font-medium">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </div>
              {accuracy && (
                <div className="text-gray-500">Accuracy: {Math.round(accuracy)}m</div>
              )}
              {speed && speed > 0 && (
                <div className="text-gray-500">Speed: {(speed * 3.6).toFixed(1)} km/h</div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {!isTracking ? (
          <button
            onClick={handleStartTracking}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
            aria-label="Start location tracking"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        ) : (
          <>
            <button
              onClick={handleStopTracking}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
              aria-label="Stop location tracking"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <button
              onClick={handleRecenter}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
              aria-label="Recenter map on location"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

