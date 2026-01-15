import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useSearchStore } from '@/stores/searchStore';
import { geocodingService } from '@/services/api/geocoding.service';
import { useMapStore } from '@/stores/mapStore';
import { GeocodeResult } from '@shared/types/geocoding';
import { SkeletonSearchResult } from '../ui/Skeleton';
import { fadeInUp, staggerContainer, staggerItem, buttonHover, buttonTap } from '@/utils/animations';

export const SearchBar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Global keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setQuery(value);
    setSelectedIndex(-1); // Reset selection when typing

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
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
    <div ref={searchRef} className="absolute top-16 md:top-20 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md px-4">
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder="Search places, addresses, landmarks..."
          className="w-full px-4 py-3.5 md:py-3 pl-12 md:pl-11 pr-24 md:pr-20 rounded-xl shadow-elevation-3 dark:shadow-dark-lg border-2 border-white/50 dark:border-white/15 bg-white/70 dark:bg-dark-bg-secondary/60 backdrop-blur-md text-gray-900 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400 dark:focus:border-brand-400 transition-all duration-normal min-h-[48px] md:min-h-0 text-base md:text-sm hover:shadow-xl hover:border-white/70 dark:hover:border-white/20"
          aria-label="Search for places"
          aria-controls="search-results"
          aria-expanded={showResults}
          aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        </div>
        {!inputValue && (
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 pointer-events-none hidden md:block">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-tertiary border border-gray-300 dark:border-dark-border-default rounded text-xs font-medium text-gray-500 dark:text-dark-text-muted">
              <span className="text-xs">⌘</span>
              <span>K</span>
            </div>
          </div>
        )}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-12 top-1/2 transform -translate-y-1/2"
            >
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 dark:border-primary-400"></div>
            </motion.div>
          )}
          {inputValue && !isLoading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={buttonHover}
              whileTap={buttonTap}
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary transition-colors"
              aria-label="Clear search"
            >
              <XMarkIcon className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            id="search-results"
            role="listbox"
            className="absolute top-full left-4 right-4 mt-2 bg-white/80 dark:bg-dark-bg-secondary/70 backdrop-blur-md rounded-lg shadow-elevation-3 dark:shadow-dark-md border border-white/40 dark:border-white/10 max-h-96 overflow-y-auto z-30"
          >
            {isLoading ? (
              // Skeleton loading state
              <div>
                {[...Array(3)].map((_, index) => (
                  <SkeletonSearchResult key={index} />
                ))}
              </div>
            ) : results.length > 0 ? (
              // Results list
              <motion.div variants={staggerContainer} initial="initial" animate="animate">
                {results.map((result, index) => (
                  <motion.button
                    key={result.id}
                    id={`search-result-${index}`}
                    role="option"
                    aria-selected={selectedIndex === index}
                    variants={staggerItem}
                    whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full text-left px-4 py-4 md:py-3 transition-colors border-b border-gray-100 dark:border-dark-border-subtle last:border-b-0 flex items-start gap-3 min-h-[60px] md:min-h-0 ${
                      selectedIndex === index
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-500 dark:border-l-primary-400'
                        : ''
                    }`}
                  >
                    <MapPinIcon className="w-5 h-5 text-primary-500 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-dark-text-primary truncate">
                        {result.placeName}
                      </div>
                      {result.context && result.context.length > 0 && (
                        <div className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1 truncate">
                          {result.context.map((ctx) => ctx.text).join(', ')}
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

