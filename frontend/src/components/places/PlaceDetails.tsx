import React from 'react';
import { Place } from '@shared/types/places';
import { useMapStore } from '@/stores/mapStore';
import { ShareButton } from '../sharing/ShareButton';

interface PlaceDetailsProps {
  place: Place;
  onClose: () => void;
}

export const PlaceDetails: React.FC<PlaceDetailsProps> = ({ place, onClose }) => {
  const { setCenter, addMarker, removeMarker } = useMapStore();

  const handleGetDirections = () => {
    // Center map on place
    setCenter(place.coordinates);
    
    // Add marker if not already present
    removeMarker(`place-${place.id}`);
    addMarker({
      id: `place-${place.id}`,
      coordinates: place.coordinates,
      title: place.name,
      color: '#ef4444',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl flex-shrink-0">{place.categoryIcon || '📍'}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{place.name}</h2>
            {place.address && (
              <p className="text-sm text-gray-600 mb-2">{place.address}</p>
            )}
            {place.category && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                {place.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rating (if available) */}
      {place.rating !== undefined && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-lg font-semibold">{place.rating.toFixed(1)}</span>
            <span className="text-yellow-400 ml-1">⭐</span>
          </div>
          {place.reviewCount !== undefined && (
            <span className="text-sm text-gray-500">({place.reviewCount} reviews)</span>
          )}
        </div>
      )}

      {/* Details */}
      <div className="space-y-3 mb-4">
        {place.phone && (
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a href={`tel:${place.phone}`} className="text-primary-600 hover:underline">
              {place.phone}
            </a>
          </div>
        )}

        {place.website && (
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline truncate"
            >
              {place.website}
            </a>
          </div>
        )}

        {place.openingHours?.openNow !== undefined && (
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={place.openingHours.openNow ? 'text-green-600' : 'text-red-600'}>
              {place.openingHours.openNow ? 'Open now' : 'Closed'}
            </span>
          </div>
        )}
      </div>

      {/* Coordinates */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-1">Coordinates</div>
        <div className="text-sm font-mono text-gray-700">
          {place.coordinates.latitude.toFixed(6)}, {place.coordinates.longitude.toFixed(6)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleGetDirections}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Get Directions
        </button>
        <ShareButton
          location={{
            coordinates: place.coordinates,
            name: place.name,
            address: place.address,
          }}
        />
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

