import React, { useEffect, useState } from 'react';
import { useTripsStore } from '@/stores/tripsStore';
import { useAuthStore } from '@/stores/authStore';
import { GroupTrip, TripStatus } from '@shared/types/trips';

export const GroupTripPlanner: React.FC = () => {
  const { trips, isLoading, error, fetchTrips, createTrip } = useTripsStore();
  const { isAuthenticated } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchTrips();
    }
  }, [fetchTrips, isAuthenticated]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTrip({ name: tripName });
      setTripName('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create trip:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-gray-600 mb-4">Please sign in to use Group Trips</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Group Trips</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{showCreateForm ? 'Cancel' : 'New Trip'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={handleCreateTrip}
          className="mb-4 p-4 bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">Trip Name</label>
          <input
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="e.g., Summer Road Trip 2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {trips.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-lg font-medium mb-2">No trips yet</p>
            <p className="text-sm">Create a new trip to start planning with friends</p>
          </div>
        ) : (
          trips.map((trip) => <TripCard key={trip.id} trip={trip} />)
        )}
      </div>
    </div>
  );
};

const TripCard: React.FC<{ trip: GroupTrip }> = ({ trip }) => {
  const { setSelectedTrip } = useTripsStore();

  const getStatusColor = (status: TripStatus) => {
    switch (status) {
      case TripStatus.PLANNING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TripStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200';
      case TripStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Not set';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      onClick={() => setSelectedTrip(trip)}
      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">{trip.name}</h3>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(
            trip.status,
          )}`}
        >
          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span>
            {trip.participants?.length || 0} participant{(trip.participants?.length || 0) !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <span>{trip.waypoints?.length || 0} waypoint{(trip.waypoints?.length || 0) !== 1 ? 's' : ''}</span>
        </div>

        {trip.startDate && (
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Starts {formatDate(trip.startDate)}</span>
          </div>
        )}
      </div>

      {trip.organizer && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Organized by {trip.organizer.email || 'Unknown'}
          </p>
        </div>
      )}
    </div>
  );
};
