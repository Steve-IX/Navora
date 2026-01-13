import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginModal, RegisterModal } from '@/components/auth';
import { useProfileStore } from '@/stores/profileStore';
import { useUIStore } from '@/stores/uiStore';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { profile } = useProfileStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const displayName = profile?.displayName || user?.email || 'Guest';
  const avatarUrl = profile?.avatarUrl;

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-30 bg-white/90 dark:bg-dark-bg-secondary/90 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border-default">
        <div className="flex items-center justify-between px-4 py-3 md:py-2">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-dark-text-primary">Maps</h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Theme Toggle Button - 44x44px touch target */}
            <button
              onClick={toggleDarkMode}
              className="p-3 md:p-2.5 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <SunIcon className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <MoonIcon className="w-5 h-5 md:w-6 md:h-6" />
              )}
            </button>

            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-10 h-10 md:w-8 md:h-8 rounded-full object-cover border-2 border-gray-200 dark:border-dark-border-default"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-medium text-sm md:text-xs">
                        {displayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary hidden sm:inline">
                    {displayName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 md:px-3 md:py-2 text-sm text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors min-h-[44px] md:min-h-0"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2.5 md:px-3 md:py-2 text-sm text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors min-h-[44px] md:min-h-0"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="px-4 py-2.5 md:px-3 md:py-2 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors min-h-[44px] md:min-h-0"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
          onSuccess={() => setShowLoginModal(false)}
        />
      )}

      {showRegisterModal && (
        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
          onSuccess={() => setShowRegisterModal(false)}
        />
      )}
    </>
  );
};

