import React, { useState, useEffect, useRef } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { geocodingService } from '@/services/api/geocoding.service';
import { useMapStore } from '@/stores/mapStore';
import { GeocodeResult } from '@shared/types/geocoding';

export const SearchBar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    query,
    results,
    isLoading,
    setQuery,
    setResults,
    setSelectedResult,
    setIsLoading,
    addToRecent,
  } = useSearchStore();

  const { setCenter, addMarker } = useMapStore();

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.length >= 2) {
      debounceTimer.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const autocompleteResults = await geocodingService.autocomplete(value);
          setResults(autocompleteResults);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelectResult = (result: GeocodeResult) => {
    setSelectedResult(result);
    setInputValue(result.placeName);
    setShowResults(false);
    setQuery('');

    // Center map on selected location
    setCenter(result.coordinates);

    // Add marker
    addMarker({
      id: `search-${result.id}`,
      coordinates: result.coordinates,
      title: result.placeName,
    });

    // Add to recent searches
    addToRecent(result);
  };

  const handleClear = () => {
    setInputValue('');
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder="Search for places..."
          className="w-full px-4 py-3 pl-10 pr-10 rounded-lg shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          aria-label="Search for places"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
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
        )}
        {isLoading && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-30">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelectResult(result)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{result.placeName}</div>
              {result.context && result.context.length > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  {result.context.map((ctx) => ctx.text).join(', ')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

