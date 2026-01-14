import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPinIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { usePlacesStore } from '@/stores/placesStore';
import { placesService } from '@/services/api/places.service';
import { useMapStore } from '@/stores/mapStore';
import { Place, PLACE_CATEGORIES } from '@shared/types/places';

interface NearbyPlacesProps {
  category?: string;
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
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

  const lastFetchedLocation = useRef<{ lat: number; lng: number } | null>(null);
  const lastFetchedCategory = useRef<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const MIN_DISTANCE_THRESHOLD = 100;

  useEffect(() => {
    if (category !== selectedCategory) {
      setSelectedCategory(category || null);
    }
  }, [category]);

  useEffect(() => {
    if (center.latitude === 0 && center.longitude === 0) return;

    const distanceMoved = lastFetchedLocation.current
      ? calculateDistance(
          lastFetchedLocation.current.lat,
          lastFetchedLocation.current.lng,
          center.latitude,
          center.longitude
        )
      : Infinity;

    const categoryChanged = lastFetchedCategory.current !== selectedCategory;
    const shouldRefetch = !lastFetchedLocation.current ||
      distanceMoved > MIN_DISTANCE_THRESHOLD ||
      categoryChanged;

    if (shouldRefetch) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        loadNearbyPlaces();
        lastFetchedLocation.current = { lat: center.latitude, lng: center.longitude };
        lastFetchedCategory.current = selectedCategory;
      }, 500);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [center, selectedCategory]);

  const loadNearbyPlaces = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const limit = selectedCategory ? 10 : 20;
      const places = await placesService.getNearbyPlaces({
        coordinates: center,
        category: selectedCategory || undefined,
        radius: 2000,
        limit,
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
    removeMarker(`nearby-place-${place.id}`);
    addMarker({
      id: `nearby-place-${place.id}`,
      coordinates: place.coordinates,
      title: place.name,
      color: '#10b981',
    });
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    lastFetchedCategory.current = null;
    lastFetchedLocation.current = null;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
          <BuildingStorefrontIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">Nearby Places</h3>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">
            {nearbyPlaces.length} {nearbyPlaces.length === 1 ? 'place' : 'places'} found
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleCategoryChange(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategory === null
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
              : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-overlay'
          }`}
        >
          All
        </motion.button>
        {PLACE_CATEGORIES.slice(0, 10).map((cat) => (
          <motion.button
            key={cat.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-overlay'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </motion.button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {!isLoading && !error && nearbyPlaces.length > 0 && (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2 max-h-96 overflow-y-auto"
        >
          {nearbyPlaces.map((place) => (
            <motion.button
              key={place.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handlePlaceSelect(place)}
              className="w-full text-left p-4 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-default rounded-xl hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center text-2xl flex-shrink-0">
                  {place.categoryIcon || '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                    {place.name}
                  </p>
                  {place.address && (
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate mt-0.5">
                      {place.address}
                    </p>
                  )}
                  {place.category && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-tertiary rounded-md text-xs text-gray-600 dark:text-dark-text-muted">
                      {PLACE_CATEGORIES.find((c) => c.id === place.category)?.name}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !error && nearbyPlaces.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <MapPinIcon className="w-8 h-8 text-gray-400 dark:text-dark-text-muted" />
          </div>
          <p className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">No places found</p>
          <p className="text-sm text-gray-500 dark:text-dark-text-muted">
            Try a different category or move the map
          </p>
        </div>
      )}
    </div>
  );
};
