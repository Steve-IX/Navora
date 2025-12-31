import React, { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { UpdateProfileDto } from '@/services/api/profiles.service';

export const UserProfile: React.FC = () => {
  const { profile, isLoading, error, fetchProfile, updateProfile } = useProfileStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>({
    displayName: '',
    statusMessage: '',
    locationSharingEnabled: false,
    shareWithFriendsOnly: true,
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        statusMessage: profile.statusMessage || '',
        locationSharingEnabled: profile.locationSharingEnabled,
        shareWithFriendsOnly: profile.shareWithFriendsOnly,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-8 text-gray-500">Profile not found</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Message
            </label>
            <textarea
              value={formData.statusMessage}
              onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.locationSharingEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, locationSharingEnabled: e.target.checked })
                }
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable Location Sharing
              </span>
            </label>

            {formData.locationSharingEnabled && (
              <label className="flex items-center space-x-2 ml-6">
                <input
                  type="checkbox"
                  checked={formData.shareWithFriendsOnly}
                  onChange={(e) =>
                    setFormData({ ...formData, shareWithFriendsOnly: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Share with friends only</span>
              </label>
            )}
          </div>

          <div className="flex space-x-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                if (profile) {
                  setFormData({
                    displayName: profile.displayName || '',
                    statusMessage: profile.statusMessage || '',
                    locationSharingEnabled: profile.locationSharingEnabled,
                    shareWithFriendsOnly: profile.shareWithFriendsOnly,
                  });
                }
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <div className="text-sm font-medium text-gray-500">Display Name</div>
            <div className="text-lg text-gray-900 mt-1">
              {profile.displayName || 'Not set'}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">Status Message</div>
            <div className="text-gray-900 mt-1">
              {profile.statusMessage || 'No status message'}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">Location Sharing</div>
            <div className="text-gray-900 mt-1">
              {profile.locationSharingEnabled ? (
                <span className="text-green-600">
                  Enabled {profile.shareWithFriendsOnly ? '(Friends only)' : '(Public)'}
                </span>
              ) : (
                <span className="text-gray-500">Disabled</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

