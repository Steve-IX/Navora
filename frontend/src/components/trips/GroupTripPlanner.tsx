import React, { useEffect, useState } from 'react';
import { useTripsStore } from '@/stores/tripsStore';
import { GroupTrip, TripStatus } from '@shared/types/trips';

export const GroupTripPlanner: React.FC = () => {
  const { trips, isLoading, error, fetchTrips, createTrip } = useTripsStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

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

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Group Trips</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showCreateForm ? 'Cancel' : 'New Trip'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateTrip} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="Trip name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Create Trip
          </button>
        </form>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {trips.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No trips yet. Create one to get started!</div>
        ) : (
          trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))
        )}
      </div>
    </div>
  );
};

const TripCard: React.FC<{ trip: GroupTrip }> = ({ trip }) => {
  const { setSelectedTrip } = useTripsStore();

  return (
    <div
      onClick={() => setSelectedTrip(trip)}
      className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{trip.name}</h3>
        <span className={`px-2 py-1 text-xs rounded ${
          trip.status === TripStatus.PLANNING ? 'bg-yellow-100 text-yellow-800' :
          trip.status === TripStatus.ACTIVE ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {trip.status}
        </span>
      </div>
      <div className="text-sm text-gray-500">
        {trip.participants?.length || 0} participants • {trip.waypoints?.length || 0} waypoints
      </div>
    </div>
  );
};

