import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/authStore';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
  onSuccess,
}) => {
  const { register, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Password strength indicators
  const passwordLength = password.length >= 6;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Focus the email input when modal opens
    setTimeout(() => emailInputRef.current?.focus(), 100);

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields');
      return false;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await register({ email, password });
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error is handled by the store
    }
  };

  const displayError = localError || error;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-title"
          >
            {/* Header with gradient accent */}
            <div className="relative px-6 pt-6 pb-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

              <div className="flex items-center justify-between">
                <div>
                  <h2 id="register-title" className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                    Create account
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                    Join Maps to save your favorite places
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>
            </div>

            <div className="px-6 pb-6">
              {/* Error Message */}
              <AnimatePresence>
                {displayError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {displayError}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                    Email address
                  </label>
                  <div className={`relative rounded-xl border-2 transition-all duration-200 ${
                    focusedField === 'email'
                      ? 'border-brand-500 ring-4 ring-brand-500/10'
                      : 'border-gray-200 dark:border-dark-border-default hover:border-gray-300 dark:hover:border-dark-border-subtle'
                  }`}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted">
                      <EnvelopeIcon className="w-5 h-5" />
                    </div>
                    <input
                      ref={emailInputRef}
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-11 pr-4 py-3 bg-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted focus:outline-none rounded-xl"
                      placeholder="you@example.com"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                    Password
                  </label>
                  <div className={`relative rounded-xl border-2 transition-all duration-200 ${
                    focusedField === 'password'
                      ? 'border-brand-500 ring-4 ring-brand-500/10'
                      : 'border-gray-200 dark:border-dark-border-default hover:border-gray-300 dark:hover:border-dark-border-subtle'
                  }`}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted">
                      <LockClosedIcon className="w-5 h-5" />
                    </div>
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-11 pr-12 py-3 bg-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted focus:outline-none rounded-xl"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  <div className="flex items-center gap-2 text-xs mt-1.5">
                    <div className={`flex items-center gap-1 ${passwordLength ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-dark-text-muted'}`}>
                      <CheckCircleIcon className={`w-4 h-4 ${passwordLength ? 'opacity-100' : 'opacity-50'}`} />
                      At least 6 characters
                    </div>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                    Confirm password
                  </label>
                  <div className={`relative rounded-xl border-2 transition-all duration-200 ${
                    focusedField === 'confirmPassword'
                      ? 'border-brand-500 ring-4 ring-brand-500/10'
                      : 'border-gray-200 dark:border-dark-border-default hover:border-gray-300 dark:hover:border-dark-border-subtle'
                  }`}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted">
                      <LockClosedIcon className="w-5 h-5" />
                    </div>
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-11 pr-12 py-3 bg-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted focus:outline-none rounded-xl"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Passwords match indicator */}
                  {confirmPassword && (
                    <div className={`flex items-center gap-1 text-xs mt-1.5 ${passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      <CheckCircleIcon className={`w-4 h-4 ${passwordsMatch ? 'opacity-100' : 'opacity-50'}`} />
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={isLoading ? {} : { scale: 1.01 }}
                  whileTap={isLoading ? {} : { scale: 0.99 }}
                  className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-h-[48px]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </motion.div>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-dark-border-default" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white dark:bg-dark-bg-secondary text-sm text-gray-500 dark:text-dark-text-muted">
                    Already have an account?
                  </span>
                </div>
              </div>

              {/* Switch to Login */}
              <motion.button
                type="button"
                onClick={onSwitchToLogin}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 border-2 border-gray-200 dark:border-dark-border-default text-gray-700 dark:text-dark-text-primary font-medium rounded-xl hover:border-brand-300 hover:bg-brand-50 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 transition-all duration-200 min-h-[48px]"
              >
                Sign in instead
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
