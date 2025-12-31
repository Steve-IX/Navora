import React, { useEffect, useState } from 'react';
import { useLocationShareStore } from '@/stores/locationShareStore';
import { useProfileStore } from '@/stores/profileStore';
import { useFriendsStore } from '@/stores/friendsStore';
import { useLocationStore } from '@/stores/locationStore';

export const LocationSharePanel: React.FC = () => {
  const {
    myActiveShares,
    isLoading,
    error,
    fetchMyActiveShares,
    startSharing,
    stopSharing,
  } = useLocationShareStore();
  const { profile, fetchProfile } = useProfileStore();
  const { friends } = useFriendsStore();
  const { currentLocation } = useLocationStore();
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [sharePublic, setSharePublic] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchMyActiveShares();
  }, [fetchProfile, fetchMyActiveShares]);

  const handleStartSharing = async () => {
    if (!currentLocation) {
      alert('Current location not available');
      return;
    }

    try {
      await startSharing(currentLocation, {
        sharedWithId: selectedFriend || undefined,
        isPublic: sharePublic,
      });
    } catch (err) {
      console.error('Failed to start sharing:', err);
    }
  };

  const handleStopSharing = async (shareId: string) => {
    try {
      await stopSharing(shareId);
    } catch (err) {
      console.error('Failed to stop sharing:', err);
    }
  };

  if (!profile) {
    return <div className="text-center py-8 text-gray-500">Loading profile...</div>;
  }

  if (!profile.locationSharingEnabled) {
    return (
      <div className="p-4">
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Location sharing is disabled. Enable it in your profile settings.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Location Sharing</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Start Sharing</h3>
          
          <div className="space-y-3 mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={sharePublic}
                onChange={() => {
                  setSharePublic(true);
                  setSelectedFriend(null);
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Share publicly</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={!sharePublic && selectedFriend === null}
                onChange={() => {
                  setSharePublic(false);
                  setSelectedFriend(null);
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Share with all friends</span>
            </label>

            {friends.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share with specific friend:
                </label>
                <select
                  value={selectedFriend || ''}
                  onChange={(e) => {
                    setSelectedFriend(e.target.value || null);
                    setSharePublic(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a friend...</option>
                  {friends.map((friend) => (
                    <option key={friend.friend.id} value={friend.friend.id}>
                      {friend.friend.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleStartSharing}
            disabled={isLoading || !currentLocation}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Starting...' : 'Start Sharing Location'}
          </button>
        </div>

        {myActiveShares.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Active Shares</h3>
            <div className="space-y-2">
              {myActiveShares.map((share) => (
                <div
                  key={share.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {share.sharedWithId ? 'Shared with friend' : 'Shared publicly'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(share.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleStopSharing(share.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Stop
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

