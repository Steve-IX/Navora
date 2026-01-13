/**
 * Empty State Component
 *
 * Displays friendly empty states with icons, messages, and optional actions.
 * Used for no search results, no saved places, no friends, etc.
 */

import React from 'react';
import { clsx } from 'clsx';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  UserGroupIcon,
  BookmarkIcon,
  ClockIcon,
  MapIcon,
} from '@heroicons/react/24/outline';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}) => {
  const isCompact = variant === 'compact';

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-6',
        'animate-fade-in',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      {icon && (
        <div
          className={clsx(
            'text-gray-400 dark:text-dark-text-muted mb-4',
            isCompact ? 'w-12 h-12' : 'w-16 h-16'
          )}
        >
          {icon}
        </div>
      )}

      {/* Title */}
      <h3
        className={clsx(
          'font-semibold text-gray-900 dark:text-dark-text-primary',
          isCompact ? 'text-base mb-1' : 'text-lg mb-2'
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={clsx(
            'text-gray-600 dark:text-dark-text-secondary max-w-sm',
            isCompact ? 'text-sm mb-3' : 'text-base mb-4'
          )}
        >
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

// ============================================================================
// PRE-BUILT EMPTY STATE VARIANTS
// ============================================================================

/**
 * No search results
 */
export const EmptySearchResults: React.FC<{ onReset?: () => void }> = ({ onReset }) => {
  return (
    <EmptyState
      icon={<MagnifyingGlassIcon className="w-16 h-16" />}
      title="No places found"
      description="Try adjusting your search terms or moving the map to explore a different area."
      action={
        onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Clear search
          </button>
        )
      }
    />
  );
};

/**
 * No saved places
 */
export const EmptySavedPlaces: React.FC<{ onExplore?: () => void }> = ({ onExplore }) => {
  return (
    <EmptyState
      icon={<BookmarkIcon className="w-16 h-16" />}
      title="No saved places yet"
      description="Start exploring and save your favorite places to see them here."
      action={
        onExplore && (
          <button
            onClick={onExplore}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Explore nearby
          </button>
        )
      }
    />
  );
};

/**
 * No friends
 */
export const EmptyFriendsList: React.FC<{ onAddFriend?: () => void }> = ({ onAddFriend }) => {
  return (
    <EmptyState
      icon={<UserGroupIcon className="w-16 h-16" />}
      title="No friends yet"
      description="Connect with friends to share locations and plan trips together."
      action={
        onAddFriend && (
          <button
            onClick={onAddFriend}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add friends
          </button>
        )
      }
    />
  );
};

/**
 * No routes
 */
export const EmptyRouteHistory: React.FC<{ onPlanRoute?: () => void }> = ({ onPlanRoute }) => {
  return (
    <EmptyState
      icon={<MapIcon className="w-16 h-16" />}
      title="No routes yet"
      description="Plan your first route to start building your trip history."
      action={
        onPlanRoute && (
          <button
            onClick={onPlanRoute}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Plan a route
          </button>
        )
      }
    />
  );
};

/**
 * No recent activity
 */
export const EmptyRecentActivity: React.FC = () => {
  return (
    <EmptyState
      icon={<ClockIcon className="w-16 h-16" />}
      title="No recent activity"
      description="Your recent searches, routes, and places will appear here."
      variant="compact"
    />
  );
};

/**
 * No nearby places
 */
export const EmptyNearbyPlaces: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  return (
    <EmptyState
      icon={<MapPinIcon className="w-16 h-16" />}
      title="No places nearby"
      description="Try moving the map or adjusting your filters to discover new places."
      action={
        onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Refresh
          </button>
        )
      }
    />
  );
};

// Add fade-in animation to your index.css:
// @keyframes fade-in {
//   from {
//     opacity: 0;
//     transform: translateY(8px);
//   }
//   to {
//     opacity: 1;
//     transform: translateY(0);
//   }
// }
//
// .animate-fade-in {
//   animation: fade-in 0.3s ease-out;
// }
