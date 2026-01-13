/**
 * Toast Notification System
 *
 * Unified toast notification system using react-hot-toast.
 * Provides consistent success, error, info, and warning notifications.
 */

import React from 'react';
import toast, { Toaster, Toast as ToastType } from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TOASTER COMPONENT (Add to App.tsx root)
// ============================================================================

export const ToastContainer: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#fff',
          color: '#374151',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
        },

        // Success
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #22c55e',
          },
        },

        // Error
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #ef4444',
          },
        },
      }}
      containerStyle={{
        top: 20,
        right: 20,
      }}
    />
  );
};

// ============================================================================
// CUSTOM TOAST COMPONENTS
// ============================================================================

interface ToastContentProps {
  t: ToastType;
  title: string;
  message?: string;
  icon: React.ReactNode;
  iconColor: string;
}

const ToastContent: React.FC<ToastContentProps> = ({ t, title, message, icon, iconColor }) => {
  return (
    <div className="flex items-start gap-3 w-full">
      {/* Icon */}
      <div className={`flex-shrink-0 ${iconColor}`}>{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-dark-text-primary">{title}</p>
        {message && (
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-0.5">{message}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-primary transition-colors"
        aria-label="Close notification"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

// ============================================================================
// TOAST FUNCTIONS
// ============================================================================

/**
 * Show a success toast notification
 */
export const showSuccessToast = (title: string, message?: string) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } bg-white dark:bg-dark-bg-secondary border border-success-500 rounded-lg shadow-lg p-4 max-w-md`}
      >
        <ToastContent
          t={t}
          title={title}
          message={message}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          iconColor="text-success-500"
        />
      </div>
    ),
    { duration: 4000 }
  );
};

/**
 * Show an error toast notification
 */
export const showErrorToast = (title: string, message?: string) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } bg-white dark:bg-dark-bg-secondary border border-error-500 rounded-lg shadow-lg p-4 max-w-md`}
      >
        <ToastContent
          t={t}
          title={title}
          message={message}
          icon={<XCircleIcon className="w-6 h-6" />}
          iconColor="text-error-500"
        />
      </div>
    ),
    { duration: 5000 }
  );
};

/**
 * Show an info toast notification
 */
export const showInfoToast = (title: string, message?: string) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } bg-white dark:bg-dark-bg-secondary border border-info-500 rounded-lg shadow-lg p-4 max-w-md`}
      >
        <ToastContent
          t={t}
          title={title}
          message={message}
          icon={<InformationCircleIcon className="w-6 h-6" />}
          iconColor="text-info-500"
        />
      </div>
    ),
    { duration: 4000 }
  );
};

/**
 * Show a warning toast notification
 */
export const showWarningToast = (title: string, message?: string) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } bg-white dark:bg-dark-bg-secondary border border-warning-500 rounded-lg shadow-lg p-4 max-w-md`}
      >
        <ToastContent
          t={t}
          title={title}
          message={message}
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          iconColor="text-warning-500"
        />
      </div>
    ),
    { duration: 4000 }
  );
};

/**
 * Show a promise toast (for async operations)
 */
export const showPromiseToast = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      style: {
        minWidth: '250px',
      },
      success: {
        duration: 3000,
      },
      error: {
        duration: 5000,
      },
    }
  );
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example usage:
 *
 * // Success
 * showSuccessToast('Place saved', 'Added to your favorites');
 *
 * // Error
 * showErrorToast('Failed to save place', 'Please try again later');
 *
 * // Info
 * showInfoToast('Location updated', 'Your current location has been refreshed');
 *
 * // Warning
 * showWarningToast('GPS accuracy low', 'Move to an open area for better results');
 *
 * // Promise (for async operations)
 * showPromiseToast(
 *   savePlace(placeData),
 *   {
 *     loading: 'Saving place...',
 *     success: 'Place saved successfully!',
 *     error: 'Failed to save place',
 *   }
 * );
 */

// Add these animations to your index.css or tailwind.config.js:
// @keyframes enter {
//   0% {
//     transform: scale(0.9);
//     opacity: 0;
//   }
//   100% {
//     transform: scale(1);
//     opacity: 1;
//   }
// }
//
// @keyframes leave {
//   0% {
//     transform: scale(1);
//     opacity: 1;
//   }
//   100% {
//     transform: scale(0.9);
//     opacity: 0;
//   }
// }
//
// .animate-enter {
//   animation: enter 0.2s ease-out;
// }
//
// .animate-leave {
//   animation: leave 0.15s ease-in forwards;
// }
