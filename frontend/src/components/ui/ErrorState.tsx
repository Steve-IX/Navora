/**
 * Error State Component
 *
 * Displays error states with retry functionality and optional reporting.
 * Used for failed API calls, network errors, and other recoverable errors.
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void | Promise<void>;
  onReport?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'inline';
  errorType?: 'generic' | 'network' | 'permission';
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  onReport,
  className,
  variant = 'default',
  errorType = 'generic',
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const isCompact = variant === 'compact';
  const isInline = variant === 'inline';

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  // Choose icon based on error type
  const getIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiIcon className={isCompact ? 'w-12 h-12' : 'w-16 h-16'} />;
      case 'permission':
        return <ExclamationTriangleIcon className={isCompact ? 'w-12 h-12' : 'w-16 h-16'} />;
      default:
        return <XCircleIcon className={isCompact ? 'w-12 h-12' : 'w-16 h-16'} />;
    }
  };

  if (isInline) {
    return (
      <div
        className={clsx(
          'flex items-center gap-3 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg',
          'animate-shake',
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <XCircleIcon className="w-5 h-5 text-error-500 flex-shrink-0" />
        <p className="text-sm text-error-700 dark:text-error-400 flex-1">{message}</p>
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-sm font-medium text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 disabled:opacity-50"
            aria-label="Retry"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-6',
        'animate-shake',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="text-error-500 dark:text-error-400 mb-4">{getIcon()}</div>

      {/* Title */}
      <h3
        className={clsx(
          'font-semibold text-gray-900 dark:text-dark-text-primary',
          isCompact ? 'text-base mb-1' : 'text-lg mb-2'
        )}
      >
        {title}
      </h3>

      {/* Message */}
      <p
        className={clsx(
          'text-gray-600 dark:text-dark-text-secondary max-w-sm',
          isCompact ? 'text-sm mb-4' : 'text-base mb-6'
        )}
      >
        {message}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg',
              'hover:bg-primary-600 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
            )}
            aria-label="Retry failed action"
          >
            <ArrowPathIcon className={clsx('w-5 h-5', isRetrying && 'animate-spin')} />
            {isRetrying ? 'Retrying...' : 'Try again'}
          </button>
        )}

        {onReport && (
          <button
            onClick={onReport}
            className={clsx(
              'px-4 py-2 text-gray-700 dark:text-dark-text-secondary border border-gray-300 dark:border-dark-border-default rounded-lg',
              'hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
            )}
            aria-label="Report this error"
          >
            Report issue
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PRE-BUILT ERROR STATE VARIANTS
// ============================================================================

/**
 * Network error
 */
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorState
      title="Connection lost"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      errorType="network"
    />
  );
};

/**
 * Failed to load data
 */
export const DataLoadError: React.FC<{ onRetry?: () => void; resource?: string }> = ({
  onRetry,
  resource = 'data',
}) => {
  return (
    <ErrorState
      title={`Failed to load ${resource}`}
      message="We couldn't load the information you requested. Please try again."
      onRetry={onRetry}
    />
  );
};

/**
 * Route calculation error
 */
export const RouteError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorState
      title="Route calculation failed"
      message="We couldn't calculate a route for your selected options. Try different locations or transport modes."
      onRetry={onRetry}
      variant="compact"
    />
  );
};

/**
 * Search error
 */
export const SearchError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorState
      title="Search failed"
      message="Something went wrong while searching. Please try again."
      onRetry={onRetry}
      variant="compact"
    />
  );
};

/**
 * Location permission error
 */
export const LocationPermissionError: React.FC<{ onRequestPermission?: () => void }> = ({
  onRequestPermission,
}) => {
  return (
    <ErrorState
      title="Location access denied"
      message="We need access to your location to show nearby places. Please enable location permissions in your browser settings."
      onRetry={onRequestPermission}
      errorType="permission"
    />
  );
};

/**
 * Generic API error
 */
export const ApiError: React.FC<{ onRetry?: () => void; onReport?: () => void }> = ({
  onRetry,
  onReport,
}) => {
  return (
    <ErrorState
      title="Request failed"
      message="The server encountered an error while processing your request."
      onRetry={onRetry}
      onReport={onReport}
    />
  );
};

/**
 * Inline error for forms and small components
 */
export const InlineError: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => {
  return <ErrorState message={message} onRetry={onRetry} variant="inline" />;
};

// Add shake animation to your index.css:
// @keyframes shake {
//   0%, 100% {
//     transform: translateX(0);
//   }
//   10%, 30%, 50%, 70%, 90% {
//     transform: translateX(-4px);
//   }
//   20%, 40%, 60%, 80% {
//     transform: translateX(4px);
//   }
// }
//
// .animate-shake {
//   animation: shake 0.5s ease-in-out;
// }
