import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  PencilIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  MapPinIcon,
  GlobeAltIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { UpdateProfileDto } from '@/services/api/profiles.service';
import { useMapStore } from '@/stores/mapStore';
import { Toggle } from '@/components/atoms/Toggle';

const tabs = [
  { id: 'profile', label: 'Profile', icon: UserCircleIcon },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheckIcon },
  { id: 'preferences', label: 'Settings', icon: Cog6ToothIcon },
] as const;

type TabId = typeof tabs[number]['id'];

export const UserProfile: React.FC = () => {
  const { profile, isLoading, error, fetchProfile, updateProfile } = useProfileStore();
  const { isAuthenticated, user } = useAuthStore();
  const { zoom, setZoom } = useMapStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
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

      if (formData.theme) {
        localStorage.setItem('theme', formData.theme);
      }

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
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <UserCircleIcon className="w-8 h-8 text-gray-400 dark:text-dark-text-muted" />
          </div>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-2">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-dark-text-muted">Profile not found</p>
      </div>
    );
  }

  const profileCompletion = calculateProfileCompletion();
  const displayName = profile.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="h-full flex flex-col">
      {/* Profile Header Card */}
      <div className="relative bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl p-6 mb-4 overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30 shadow-lg">
                <span className="text-white font-bold text-3xl">
                  {displayName[0].toUpperCase()}
                </span>
              </div>
            )}
            {isEditing && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
              >
                <CameraIcon className="w-4 h-4 text-gray-600" />
              </motion.button>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
            <p className="text-white/80 text-sm truncate">{user?.email}</p>
            {profile.statusMessage && (
              <p className="text-white/70 text-sm mt-1 line-clamp-1">{profile.statusMessage}</p>
            )}
          </div>

          {/* Edit Button */}
          {!isEditing && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(true)}
              className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-colors"
            >
              <PencilIcon className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </div>

        {/* Profile Completion */}
        {profileCompletion < 100 && !isEditing && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80">Profile completion</span>
              <span className="text-sm font-semibold text-white">{profileCompletion}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileCompletion}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-600 dark:text-green-400 flex items-center gap-2"
          >
            <CheckIcon className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
        {(error || localError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <XMarkIcon className="w-5 h-5" />
            {error || localError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-dark-bg-tertiary rounded-xl mb-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary shadow-sm'
                  : 'text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Avatar URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={formData.avatarUrl}
                      onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-border-default rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary transition-all"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-border-default rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary transition-all"
                      maxLength={100}
                      placeholder="Your display name"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.statusMessage}
                      onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-border-default rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary transition-all resize-none"
                      rows={4}
                      maxLength={500}
                      placeholder="Tell us about yourself..."
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-dark-text-muted text-right">
                      {formData.statusMessage?.length || 0}/500
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'privacy' && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-xl">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <MapPinIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Location Sharing</h3>
                        <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-0.5">
                          Let friends see your location on the map
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Toggle
                        checked={formData.locationSharingEnabled || false}
                        onChange={(checked) => setFormData({ ...formData, locationSharingEnabled: checked })}
                        label="Enable location sharing"
                      />

                      {formData.locationSharingEnabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-4 pt-2 border-t border-gray-200 dark:border-dark-border-default"
                        >
                          <Toggle
                            checked={formData.shareWithFriendsOnly || false}
                            onChange={(checked) => setFormData({ ...formData, shareWithFriendsOnly: checked })}
                            label="Friends only"
                            description="Only share with accepted friends"
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['light', 'dark', 'system'].map((theme) => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => setFormData({ ...formData, theme })}
                          className={`px-4 py-3 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                            formData.theme === theme
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                              : 'border-gray-200 dark:border-dark-border-default text-gray-600 dark:text-dark-text-secondary hover:border-gray-300 dark:hover:border-dark-border-subtle'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
                      Default Map Zoom ({formData.defaultZoom})
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={formData.defaultZoom}
                      onChange={(e) => setFormData({ ...formData, defaultZoom: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-dark-bg-tertiary rounded-full appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                      <span>World</span>
                      <span>Street</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-dark-border-default">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-md shadow-brand-500/25 transition-all"
              >
                Save Changes
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
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
                className="px-6 py-3 bg-gray-100 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-dark-bg-overlay transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </form>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-xl">
                  <p className="text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-1">Bio</p>
                  <p className="text-gray-900 dark:text-dark-text-primary whitespace-pre-wrap">
                    {profile.statusMessage || (
                      <span className="text-gray-400 dark:text-dark-text-muted italic">No bio yet</span>
                    )}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div
                key="privacy-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-xl flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    profile.locationSharingEnabled
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-200 dark:bg-dark-bg-overlay'
                  }`}>
                    {profile.locationSharingEnabled ? (
                      <GlobeAltIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <MapPinIcon className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-dark-text-primary">Location Sharing</p>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                      {profile.locationSharingEnabled ? 'Your location is visible' : 'Location hidden'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    profile.locationSharingEnabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-200 dark:bg-dark-bg-overlay text-gray-600 dark:text-dark-text-secondary'
                  }`}>
                    {profile.locationSharingEnabled ? 'On' : 'Off'}
                  </span>
                </div>

                {profile.locationSharingEnabled && (
                  <div className="p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-dark-text-primary">Visibility</p>
                      <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                        {profile.shareWithFriendsOnly ? 'Friends only' : 'Everyone'}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div
                key="preferences-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-xl">
                  <p className="text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-1">Theme</p>
                  <p className="text-gray-900 dark:text-dark-text-primary capitalize">
                    {localStorage.getItem('theme') || 'light'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-xl">
                  <p className="text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-1">Default Zoom</p>
                  <p className="text-gray-900 dark:text-dark-text-primary">{zoom}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
