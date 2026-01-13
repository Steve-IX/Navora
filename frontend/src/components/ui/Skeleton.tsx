/**
 * Skeleton Loading Component
 *
 * Provides smooth loading skeletons with shimmer animation for better UX.
 * Replaces simple spinners with content-aware placeholders.
 */

import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rectangle' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'wave',
}) => {
  // Base classes for all skeletons
  const baseClasses = 'bg-gray-200 dark:bg-dark-bg-tertiary';

  // Variant-specific classes
  const variantClasses = {
    text: 'rounded h-4',
    circle: 'rounded-full',
    rectangle: 'rounded-none',
    rounded: 'rounded-lg',
  };

  // Animation classes
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  // Inline styles for custom dimensions
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// ============================================================================
// PRE-BUILT SKELETON VARIANTS
// ============================================================================

/**
 * Text line skeleton with configurable width
 */
export const SkeletonText: React.FC<{ className?: string; width?: string }> = ({
  className,
  width = '100%',
}) => {
  return <Skeleton variant="text" width={width} className={className} />;
};

/**
 * Circle skeleton for avatars
 */
export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className,
}) => {
  return <Skeleton variant="circle" width={size} height={size} className={className} />;
};

/**
 * Card skeleton with multiple lines
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('p-4 space-y-3', className)}>
      <Skeleton variant="rounded" height={120} />
      <SkeletonText width="80%" />
      <SkeletonText width="60%" />
    </div>
  );
};

/**
 * List item skeleton
 */
export const SkeletonListItem: React.FC<{ className?: string; withAvatar?: boolean }> = ({
  className,
  withAvatar = false,
}) => {
  return (
    <div className={clsx('flex items-center gap-3 p-3', className)}>
      {withAvatar && <SkeletonAvatar size={40} />}
      <div className="flex-1 space-y-2">
        <SkeletonText width="70%" />
        <SkeletonText width="50%" />
      </div>
    </div>
  );
};

/**
 * Search result skeleton
 */
export const SkeletonSearchResult: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('p-4 space-y-2', className)}>
      <div className="flex items-start gap-3">
        <Skeleton variant="circle" width={24} height={24} />
        <div className="flex-1 space-y-2">
          <SkeletonText width="90%" />
          <SkeletonText width="60%" />
        </div>
      </div>
    </div>
  );
};

/**
 * Place details skeleton
 */
export const SkeletonPlaceDetails: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {/* Hero image */}
      <Skeleton variant="rounded" height={240} className="w-full" />

      {/* Title and rating */}
      <div className="px-4 space-y-3">
        <SkeletonText width="80%" className="h-6" />
        <SkeletonText width="40%" />
      </div>

      {/* Info cards */}
      <div className="px-4 space-y-3">
        <Skeleton variant="rounded" height={60} />
        <Skeleton variant="rounded" height={60} />
        <Skeleton variant="rounded" height={60} />
      </div>
    </div>
  );
};

/**
 * Route card skeleton
 */
export const SkeletonRouteCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('p-4 space-y-3 border border-gray-200 rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={32} height={32} />
        <div className="flex-1 space-y-2">
          <SkeletonText width="60%" />
          <SkeletonText width="40%" />
        </div>
      </div>
    </div>
  );
};

/**
 * Friend card skeleton
 */
export const SkeletonFriendCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('flex items-center gap-3 p-3', className)}>
      <SkeletonAvatar size={48} />
      <div className="flex-1 space-y-2">
        <SkeletonText width="60%" />
        <SkeletonText width="40%" />
      </div>
      <Skeleton variant="rounded" width={80} height={32} />
    </div>
  );
};

// Add CSS for wave animation to your global styles or index.css:
// @keyframes skeleton-wave {
//   0% {
//     background-position: -200% 0;
//   }
//   100% {
//     background-position: 200% 0;
//   }
// }
//
// .skeleton-wave {
//   background: linear-gradient(
//     90deg,
//     rgba(255, 255, 255, 0) 0%,
//     rgba(255, 255, 255, 0.2) 20%,
//     rgba(255, 255, 255, 0.5) 60%,
//     rgba(255, 255, 255, 0)
//   );
//   background-size: 200% 100%;
//   animation: skeleton-wave 1.5s ease-in-out infinite;
// }
