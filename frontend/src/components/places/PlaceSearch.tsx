import React, { useState, useEffect, useRef } from 'react';
import { usePlacesStore } from '@/stores/placesStore';
import { placesService } from '@/services/api/places.service';
import { useMapStore } from '@/stores/mapStore';
import { Place, PLACE_CATEGORIES } from '@shared/types/places';

export const PlaceSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    places,
    selectedCategory,
    isLoading,
    error,
    setPlaces,
    setSelectedPlace,
    setSelectedCategory,
    setIsLoading,
    setError,
    setSearchQuery,
  } = usePlacesStore();

  const { setCenter, addMarker, removeMarker, center } = useMapStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowCategories(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery: string, category?: string | null) => {
    if (searchQuery.length < 2 && !category) {
      setPlaces([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchQuery(searchQuery);

    try {
      const results = await placesService.searchPlaces({
        query: searchQuery || category || '',
        category: category || undefined,
        coordinates: center,
        limit: 20,
      });
      setPlaces(results);
    } catch (err: any) {
      setError(err.message || 'Failed to search places');
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.length >= 2 || selectedCategory) {
      debounceTimer.current = setTimeout(() => {
        handleSearch(value, selectedCategory);
      }, 300);
    } else {
      setPlaces([]);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    handleSearch(query, newCategory);
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setCenter(place.coordinates);
    
    // Remove previous place markers
    removeMarker(`place-${place.id}`);
    
    // Add marker for selected place
    addMarker({
      id: `place-${place.id}`,
      coordinates: place.coordinates,
      title: place.name,
      color: '#ef4444',
    });
  };

  return (
    <div ref={searchRef} className="w-full">
      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for places..."
          className="w-full px-4 py-3 pl-10 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {isLoading && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          </div>
        )}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setPlaces([]);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <button
          onClick={() => setShowCategories(!showCategories)}
          className="w-full px-4 py-2 text-left bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-between"
        >
          <span className="text-sm font-medium text-gray-700">
            {selectedCategory
              ? `Category: ${PLACE_CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Selected'}`
              : 'Filter by Category'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 transform transition-transform ${showCategories ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCategories && (
          <div className="mt-2 grid grid-cols-3 gap-2 p-2 bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {PLACE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`p-3 rounded-lg text-center transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-100 border-2 border-primary-600'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="text-2xl mb-1">{category.icon}</div>
                <div className="text-xs font-medium text-gray-700">{category.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Results */}
      {places.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {places.map((place) => (
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

      {places.length === 0 && query.length >= 2 && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">No places found</div>
      )}
    </div>
  );
};

