import React, { useEffect, useState, useRef } from 'react';
import { usePlacesStore } from '@/stores/placesStore';
import { placesService } from '@/services/api/places.service';
import { useMapStore } from '@/stores/mapStore';
import { Place, PLACE_CATEGORIES } from '@shared/types/places';

interface NearbyPlacesProps {
  category?: string;
}

// Calculate distance between two coordinates in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const NearbyPlaces: React.FC<NearbyPlacesProps> = ({ category }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category || null);
  const { center } = useMapStore();
  const {
    nearbyPlaces,
    isLoading,
    error,
    setNearbyPlaces,
    setSelectedPlace,
    setIsLoading,
    setError,
  } = usePlacesStore();

  const { setCenter: setMapCenter, addMarker, removeMarker } = useMapStore();
  
  // Track last fetched location and debounce timer
  const lastFetchedLocation = useRef<{ lat: number; lng: number } | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const MIN_DISTANCE_THRESHOLD = 100; // Only refetch if moved at least 100 meters

  useEffect(() => {
    if (center.latitude === 0 && center.longitude === 0) {
      return;
    }

    // Check if we need to refetch based on distance moved
    const shouldRefetch = !lastFetchedLocation.current ||
      calculateDistance(
        lastFetchedLocation.current.lat,
        lastFetchedLocation.current.lng,
        center.latitude,
        center.longitude
      ) > MIN_DISTANCE_THRESHOLD;

    if (shouldRefetch) {
      // Clear existing debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Debounce the API call by 500ms
      debounceTimer.current = setTimeout(() => {
        loadNearbyPlaces();
        lastFetchedLocation.current = {
          lat: center.latitude,
          lng: center.longitude,
        };
      }, 500);
    }

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [center, selectedCategory]);

  const loadNearbyPlaces = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const places = await placesService.getNearbyPlaces({
        coordinates: center,
        category: selectedCategory || undefined,
        radius: 2000, // 2km radius
        limit: 20,
      });
      setNearbyPlaces(places);
    } catch (err: any) {
      setError(err.message || 'Failed to load nearby places');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setMapCenter(place.coordinates);
    
    // Remove previous place markers
    removeMarker(`nearby-place-${place.id}`);
    
    // Add marker for selected place
    addMarker({
      id: `nearby-place-${place.id}`,
      coordinates: place.coordinates,
      title: place.name,
      color: '#10b981',
    });
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    // Reset last fetched location when category changes to force immediate refetch
    lastFetchedLocation.current = null;
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Nearby Places</h3>
        
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {PLACE_CATEGORIES.slice(0, 10).map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && nearbyPlaces.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {nearbyPlaces.map((place) => (
            <button
              key={place.id}
              onClick={() => handlePlaceSelect(place)}
              className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{place.categoryIcon || '📍'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{place.name}</div>
                  {place.address && (
                    <div className="text-sm text-gray-500 truncate mt-1">{place.address}</div>
                  )}
                  {place.category && (
                    <div className="text-xs text-gray-400 mt-1">
                      {PLACE_CATEGORIES.find((c) => c.id === place.category)?.name}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!isLoading && !error && nearbyPlaces.length === 0 && (
        <div className="text-center py-8 text-gray-500">No nearby places found</div>
      )}
    </div>
  );
};

