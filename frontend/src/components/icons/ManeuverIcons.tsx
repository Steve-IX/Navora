/**
 * Maneuver Icons
 *
 * Professional navigation maneuver icons using Heroicons.
 * Replaces ASCII arrows (↰, ↱) with proper vector graphics for turn-by-turn navigation.
 */

import React from 'react';
import {
  ArrowUpIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';

interface IconProps {
  className?: string;
  'aria-label'?: string;
}

// ============================================================================
// STRAIGHT / CONTINUE
// ============================================================================

export const StraightIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <ArrowUpIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Continue straight'}
    />
  );
};

// ============================================================================
// TURN RIGHT
// ============================================================================

export const TurnRightIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Turn right'}
      role="img"
    >
      {/* Turn right arrow */}
      <path
        d="M7 4v10a4 4 0 004 4h6m0 0l-3-3m3 3l-3 3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// TURN LEFT
// ============================================================================

export const TurnLeftIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Turn left'}
      role="img"
    >
      {/* Turn left arrow */}
      <path
        d="M17 4v10a4 4 0 01-4 4H7m0 0l3-3m-3 3l3 3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// SLIGHT RIGHT
// ============================================================================

export const SlightRightIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Slight right'}
      role="img"
    >
      {/* Slight right curve */}
      <path
        d="M9 4v10a2 2 0 002 2h6m0 0l-3-3m3 3l-3 3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// SLIGHT LEFT
// ============================================================================

export const SlightLeftIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Slight left'}
      role="img"
    >
      {/* Slight left curve */}
      <path
        d="M15 4v10a2 2 0 01-2 2H7m0 0l3-3m-3 3l3 3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// SHARP RIGHT
// ============================================================================

export const SharpRightIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Sharp right'}
      role="img"
    >
      {/* Sharp right turn */}
      <path
        d="M5 4v8a6 6 0 006 6h6m0 0l-3-3m3 3l-3 3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// SHARP LEFT
// ============================================================================

export const SharpLeftIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Sharp left'}
      role="img"
    >
      {/* Sharp left turn */}
      <path
        d="M19 4v8a6 6 0 01-6 6H7m0 0l3-3m-3 3l3 3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// U-TURN LEFT (using Heroicons)
// ============================================================================

export const UTurnLeftIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <ArrowUturnLeftIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'U-turn left'}
    />
  );
};

// ============================================================================
// U-TURN RIGHT (using Heroicons)
// ============================================================================

export const UTurnRightIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <ArrowUturnRightIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'U-turn right'}
    />
  );
};

// ============================================================================
// ROUNDABOUT
// ============================================================================

export const RoundaboutIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Roundabout'}
      role="img"
    >
      {/* Roundabout icon */}
      <circle cx="12" cy="12" r="6" strokeWidth="2" />
      <path
        d="M12 6V2m0 20v-4M6 12H2m20 0h-4"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 12h3m-3 0l2 2m-2-2l2-2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// MERGE
// ============================================================================

export const MergeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Merge'}
      role="img"
    >
      {/* Merge icon */}
      <path
        d="M9 3v6l3 3 3-3V3M9 15v6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// FORK (Keep left/right)
// ============================================================================

export const ForkIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Fork'}
      role="img"
    >
      {/* Fork icon */}
      <path
        d="M12 3v6M9 12l-3 9M15 12l3 9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// EXPORT ALL MANEUVER ICONS
// ============================================================================

export const ManeuverIcons = {
  Straight: StraightIcon,
  TurnRight: TurnRightIcon,
  TurnLeft: TurnLeftIcon,
  SlightRight: SlightRightIcon,
  SlightLeft: SlightLeftIcon,
  SharpRight: SharpRightIcon,
  SharpLeft: SharpLeftIcon,
  UTurnLeft: UTurnLeftIcon,
  UTurnRight: UTurnRightIcon,
  Roundabout: RoundaboutIcon,
  Merge: MergeIcon,
  Fork: ForkIcon,
} as const;

// Helper function to get maneuver icon by instruction type
export const getManeuverIcon = (maneuver?: string): React.FC<IconProps> => {
  if (!maneuver) return StraightIcon;

  const lower = maneuver.toLowerCase();

  if (lower.includes('straight') || lower.includes('continue')) return StraightIcon;
  if (lower.includes('slight right')) return SlightRightIcon;
  if (lower.includes('slight left')) return SlightLeftIcon;
  if (lower.includes('sharp right')) return SharpRightIcon;
  if (lower.includes('sharp left')) return SharpLeftIcon;
  if (lower.includes('turn right') || lower.includes('right turn')) return TurnRightIcon;
  if (lower.includes('turn left') || lower.includes('left turn')) return TurnLeftIcon;
  if (lower.includes('u-turn left') || lower.includes('uturn left')) return UTurnLeftIcon;
  if (lower.includes('u-turn right') || lower.includes('uturn right')) return UTurnRightIcon;
  if (lower.includes('roundabout')) return RoundaboutIcon;
  if (lower.includes('merge')) return MergeIcon;
  if (lower.includes('fork')) return ForkIcon;

  return StraightIcon;
};
