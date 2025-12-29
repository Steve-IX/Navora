import React, { useState, useEffect } from 'react';
import { Place } from '@shared/types/places';
import { useMapStore } from '@/stores/mapStore';
import { ShareButton } from '../sharing/ShareButton';
import { placesService } from '@/services/api/places.service';
import { getPlaceholderImage, getPlaceholderThumbnail } from '@/utils/placeholders';

interface PlaceDetailsProps {
  place: Place;
  onClose: () => void;
}

export const PlaceDetails: React.FC<PlaceDetailsProps> = ({ place, onClose }) => {
  const { setCenter, addMarker, removeMarker } = useMapStore();
  const [detailedPlace, setDetailedPlace] = useState<Place | null>(place);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    // Fetch detailed place information if not already loaded
    if (!place.photos || !place.description) {
      placesService.getPlaceDetails(place.id)
        .then((details) => {
          setDetailedPlace(details);
        })
        .catch((error) => {
          console.error('Failed to load place details:', error);
          setDetailedPlace(place); // Fallback to basic place info
        });
    }
  }, [place.id]);

  const displayPlace = detailedPlace || place;

  const handleGetDirections = () => {
    // Center map on place
    setCenter(displayPlace.coordinates);
    
    // Add marker if not already present
    removeMarker(`place-${displayPlace.id}`);
    addMarker({
      id: `place-${displayPlace.id}`,
      coordinates: displayPlace.coordinates,
      title: displayPlace.name,
      color: '#ef4444',
    });
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <span key={i} className="text-yellow-400 text-lg">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-lg">☆</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={i} className="text-gray-300 text-lg">★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="p-0 overflow-y-auto max-h-[90vh]">
      {/* Photo Gallery */}
      {displayPlace.photos && displayPlace.photos.length > 0 && (
        <div className="relative w-full h-64 bg-gray-200">
          <img
            src={displayPlace.photos[selectedPhotoIndex]?.url || displayPlace.photos[0]?.url}
            alt={displayPlace.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to local placeholder if image fails to load
              (e.target as HTMLImageElement).src = getPlaceholderImage(displayPlace.name, 800, 600);
            }}
          />
          {displayPlace.photos.length > 1 && (
            <>
              <div className="absolute bottom-4 left-4 flex gap-2">
                {displayPlace.photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`w-16 h-16 rounded overflow-hidden border-2 ${
                      selectedPhotoIndex === index ? 'border-white' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`${displayPlace.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to local placeholder if image fails to load
                        (e.target as HTMLImageElement).src = getPlaceholderThumbnail(index, 100, 100);
                      }}
                    />
                  </button>
                ))}
              </div>
              {displayPlace.photos.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedPhotoIndex + 1} / {displayPlace.photos.length}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start gap-4">
            <div className="text-4xl flex-shrink-0">{displayPlace.categoryIcon || '📍'}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayPlace.name}</h2>
              {displayPlace.address && (
                <p className="text-sm text-gray-600 mb-2">{displayPlace.address}</p>
              )}
              {displayPlace.category && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {displayPlace.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating and Reviews */}
        {displayPlace.rating !== undefined && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{displayPlace.rating.toFixed(1)}</span>
                {renderStars(displayPlace.rating)}
              </div>
              {displayPlace.reviewCount !== undefined && (
                <span className="text-sm text-gray-600">
                  {displayPlace.reviewCount.toLocaleString()} reviews
                </span>
              )}
            </div>
            {displayPlace.priceLevel !== undefined && (
              <div className="text-sm text-gray-600">
                Price level: {'$'.repeat(displayPlace.priceLevel)}{'·'.repeat(4 - displayPlace.priceLevel)}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {displayPlace.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">{displayPlace.description}</p>
          </div>
        )}

        {/* Details */}
        <div className="space-y-3 mb-4">
          {displayPlace.openingHours?.openNow !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <span className={`font-medium ${displayPlace.openingHours.openNow ? 'text-green-600' : 'text-red-600'}`}>
                  {displayPlace.openingHours.openNow ? 'Open now' : 'Closed'}
                </span>
                {displayPlace.openingHours.weekdayText && displayPlace.openingHours.weekdayText.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {displayPlace.openingHours.weekdayText[new Date().getDay()] || displayPlace.openingHours.weekdayText[0]}
                  </div>
                )}
              </div>
            </div>
          )}

          {displayPlace.phone && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${displayPlace.phone}`} className="text-primary-600 hover:underline flex-1">
                {displayPlace.phone}
              </a>
            </div>
          )}

          {displayPlace.website && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <a
                href={displayPlace.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate flex-1"
              >
                {displayPlace.website}
              </a>
            </div>
          )}

          {/* Opening Hours Details */}
          {displayPlace.openingHours?.weekdayText && displayPlace.openingHours.weekdayText.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Opening Hours</div>
              <div className="space-y-1">
                {displayPlace.openingHours.weekdayText.map((hours, index) => (
                  <div key={index} className="text-xs text-gray-600 flex justify-between">
                    <span>{hours.split(':')[0]}</span>
                    <span>{hours.split(':').slice(1).join(':').trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coordinates */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Coordinates</div>
          <div className="text-sm font-mono text-gray-700">
            {displayPlace.coordinates.latitude.toFixed(6)}, {displayPlace.coordinates.longitude.toFixed(6)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sticky bottom-0 bg-white pt-4 pb-2 border-t">
          <button
            onClick={handleGetDirections}
            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Get Directions
          </button>
          <ShareButton
            location={{
              coordinates: displayPlace.coordinates,
              name: displayPlace.name,
              address: displayPlace.address,
            }}
          />
          <button
            onClick={onClose}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

