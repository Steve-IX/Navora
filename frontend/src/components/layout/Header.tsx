import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { LoginModal, RegisterModal } from '@/components/auth';
import { useProfileStore } from '@/stores/profileStore';
import { useUIStore } from '@/stores/uiStore';
import {
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  CloudIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { profile } = useProfileStore();
  const { darkMode, toggleDarkMode, setSidePanelContent, setSidePanelOpen } =
    useUIStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatarUrl;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center justify-end px-4 h-[48px] md:h-[40px]">
          {/* Right Section */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/70 dark:bg-dark-bg-secondary/60 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm px-2 py-1">
            {/* Weather + Flights shortcuts */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSidePanelContent('weather');
                setSidePanelOpen(true);
              }}
              className="p-2.5 rounded-xl text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary hover:bg-white/40 dark:hover:bg-dark-bg-tertiary/60 transition-colors"
              aria-label="Open weather panel"
            >
              <CloudIcon className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSidePanelContent('flights');
                setSidePanelOpen(true);
              }}
              className="p-2.5 rounded-xl text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary hover:bg-white/40 dark:hover:bg-dark-bg-tertiary/60 transition-colors"
              aria-label="Open flights panel"
            >
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary hover:bg-white/40 dark:hover:bg-dark-bg-tertiary/60 transition-colors"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={darkMode ? 'dark' : 'light'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {darkMode ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* User Avatar & Name */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/40 dark:hover:bg-dark-bg-tertiary/60 transition-colors cursor-default">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-200 dark:ring-brand-800"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center ring-2 ring-brand-200 dark:ring-brand-800">
                      <span className="text-white font-semibold text-sm">
                        {displayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary hidden sm:inline max-w-[100px] truncate">
                    {displayName}
                  </span>
                </div>

                {/* Sign Out Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  aria-label="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-white/40 dark:hover:bg-dark-bg-tertiary/60 rounded-xl transition-colors"
                >
                  Sign In
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRegisterModal(true)}
                  className="px-4 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/25 hover:shadow-brand-600/30 transition-all"
                >
                  Sign Up
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                Sign out?
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-6">
                Are you sure you want to sign out of your account?
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-bg-tertiary hover:bg-gray-200 dark:hover:bg-dark-bg-overlay rounded-xl transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md shadow-red-500/25 transition-all"
                >
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
