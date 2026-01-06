import React, { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { UpdateProfileDto } from '@/services/api/profiles.service';
import { useMapStore } from '@/stores/mapStore';

export const UserProfile: React.FC = () => {
  const { profile, isLoading, error, fetchProfile, updateProfile } = useProfileStore();
  const { isAuthenticated, user } = useAuthStore();
  const { zoom, setZoom } = useMapStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'preferences'>('profile');
  const [formData, setFormData] = useState<UpdateProfileDto & { theme?: string; defaultZoom?: number }>({
    displayName: '',
    statusMessage: '',
    avatarUrl: '',
    locationSharingEnabled: false,
    shareWithFriendsOnly: true,
    theme: localStorage.getItem('theme') || 'light',
    defaultZoom: zoom,
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [fetchProfile, isAuthenticated]);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        statusMessage: profile.statusMessage || '',
        avatarUrl: profile.avatarUrl || '',
        locationSharingEnabled: profile.locationSharingEnabled,
        shareWithFriendsOnly: profile.shareWithFriendsOnly,
        theme: localStorage.getItem('theme') || 'light',
        defaultZoom: zoom,
      });
    }
  }, [profile, zoom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    try {
      const updateData: UpdateProfileDto = {
        displayName: formData.displayName || undefined,
        statusMessage: formData.statusMessage || undefined,
        avatarUrl: formData.avatarUrl || undefined,
        locationSharingEnabled: formData.locationSharingEnabled,
        shareWithFriendsOnly: formData.shareWithFriendsOnly,
      };
      await updateProfile(updateData);

      // Save theme preference to localStorage
      if (formData.theme) {
        localStorage.setItem('theme', formData.theme);
      }

      // Save default zoom
      if (formData.defaultZoom) {
        setZoom(formData.defaultZoom);
      }

      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to update profile');
    }
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const total = 4;

    if (profile.displayName) completed++;
    if (profile.avatarUrl) completed++;
    if (profile.statusMessage) completed++;
    if (profile.locationSharingEnabled) completed++;

    return Math.round((completed / total) * 100);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-gray-600 mb-4">Please sign in to view and edit your profile</p>
        </div>
      </div>
    );
  }

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

  const profileCompletion = calculateProfileCompletion();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Profile Completion Indicator */}
      {!isEditing && profileCompletion < 100 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Profile Completion</span>
            <span className="text-sm text-blue-700">{profileCompletion}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          {successMessage}
        </div>
      )}

      {(error || localError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error || localError}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'privacy'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'preferences'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Preferences
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Avatar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture URL
                  </label>
                  <div className="flex items-center space-x-4">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center border-2 border-gray-300">
                        <span className="text-primary-600 font-medium text-2xl">
                          {(formData.displayName || user?.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="url"
                        value={formData.avatarUrl}
                        onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://example.com/avatar.jpg"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter a URL to your profile picture
                      </p>
                    </div>
                  </div>
                </div>

                {/* Display Name */}
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
                    placeholder="Your display name"
                  />
                </div>

                {/* Status Message / Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio / Status Message
                  </label>
                  <textarea
                    value={formData.statusMessage}
                    onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    maxLength={500}
                    placeholder="Tell us about yourself..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.statusMessage?.length || 0}/500 characters
                  </p>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Location Sharing</h3>

                  <label className="flex items-center space-x-3 mb-4">
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
                    <label className="flex items-center space-x-3 ml-6">
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

                  <p className="mt-2 text-xs text-gray-500">
                    When enabled, your friends can see your current location on the map
                  </p>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Theme Preference
                  </label>
                  <select
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Map Zoom Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.defaultZoom}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultZoom: parseInt(e.target.value) || 12 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Zoom level when opening the map (1-20)</p>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex space-x-2 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setLocalError(null);
                  if (profile) {
                    setFormData({
                      displayName: profile.displayName || '',
                      statusMessage: profile.statusMessage || '',
                      avatarUrl: profile.avatarUrl || '',
                      locationSharingEnabled: profile.locationSharingEnabled,
                      shareWithFriendsOnly: profile.shareWithFriendsOnly,
                      theme: localStorage.getItem('theme') || 'light',
                      defaultZoom: zoom,
                    });
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Avatar Display */}
                <div className="flex items-center space-x-4">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName || 'Avatar'}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center border-4 border-gray-200">
                      <span className="text-primary-600 font-medium text-3xl">
                        {(profile.displayName || user?.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {profile.displayName || user?.email || 'User'}
                    </h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Display Name</div>
                  <div className="text-lg text-gray-900">
                    {profile.displayName || <span className="text-gray-400">Not set</span>}
                  </div>
                </div>

                {/* Status Message */}
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Bio / Status</div>
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {profile.statusMessage || <span className="text-gray-400">No status message</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Location Sharing</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Location Sharing</span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          profile.locationSharingEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {profile.locationSharingEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {profile.locationSharingEnabled && (
                      <div className="flex items-center justify-between ml-4">
                        <span className="text-sm text-gray-600">Share with</span>
                        <span className="text-sm text-gray-700">
                          {profile.shareWithFriendsOnly ? 'Friends only' : 'Everyone'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Theme</div>
                  <div className="text-gray-900 capitalize">
                    {localStorage.getItem('theme') || 'light'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Default Map Zoom</div>
                  <div className="text-gray-900">{zoom}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
