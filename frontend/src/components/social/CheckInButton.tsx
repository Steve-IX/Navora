import React, { useState } from 'react';
import { checkinsService } from '@/services/api/checkins.service';
import { Coordinates } from '@shared/types/geocoding';
import { Place } from '@shared/types/places';

interface CheckInButtonProps {
  place: Place;
  coordinates: Coordinates;
  onCheckInComplete?: () => void;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  place,
  coordinates,
  onCheckInComplete,
}) => {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleCheckIn = async () => {
    if (showNoteInput && !note.trim()) {
      return;
    }

    setIsCheckingIn(true);
    try {
      await checkinsService.createCheckIn({
        coordinates,
        placeName: place.name,
        placeId: place.id,
        note: note.trim() || undefined,
      });
      setNote('');
      setShowNoteInput(false);
      onCheckInComplete?.();
    } catch (error: any) {
      console.error('Failed to check in:', error);
      alert(error.message || 'Failed to check in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="space-y-2">
      {showNoteInput && (
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-muted"
            rows={3}
          />
        </div>
      )}
      <button
        onClick={() => {
          if (showNoteInput) {
            handleCheckIn();
          } else {
            setShowNoteInput(true);
          }
        }}
        disabled={isCheckingIn}
        className="w-full px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCheckingIn ? 'Checking in...' : showNoteInput ? 'Complete Check-in' : 'Check In'}
      </button>
      {showNoteInput && (
        <button
          onClick={() => {
            setShowNoteInput(false);
            setNote('');
          }}
          className="w-full px-4 py-2 bg-gray-200 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-300 dark:hover:bg-dark-bg-overlay"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

