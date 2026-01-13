/**
 * Transport Mode Icons
 *
 * Professional icon components for different transportation modes using Heroicons and custom SVG.
 * Replaces emoji icons with scalable, accessible vector graphics.
 */

import React from 'react';
import { TruckIcon, UserIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface IconProps {
  className?: string;
  'aria-label'?: string;
}

// ============================================================================
// DRIVING ICON (using TruckIcon from Heroicons)
// ============================================================================

export const DrivingIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => {
  return <TruckIcon className={className} {...props} />;
};

// ============================================================================
// WALKING ICON (using UserIcon from Heroicons)
// ============================================================================

export const WalkingIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => {
  return <UserIcon className={className} {...props} />;
};

// ============================================================================
// CYCLING ICON (custom SVG - not in Heroicons)
// ============================================================================

export const CyclingIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Cycling'}
      role="img"
    >
      {/* Bicycle SVG path */}
      <circle cx="6" cy="19" r="2.5" strokeWidth="1.5" />
      <circle cx="18" cy="19" r="2.5" strokeWidth="1.5" />
      <path
        d="M12 9l-2 6h4l-2-6z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9V4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 4h3"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="6" y1="19" x2="10" y2="15" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="19" x2="14" y2="15" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ============================================================================
// TRANSIT ICON (custom SVG - bus/metro)
// ============================================================================

export const TransitIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Public Transit'}
      role="img"
    >
      {/* Bus/Transit SVG path */}
      <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth="1.5" />
      <path d="M4 10h16" strokeWidth="1.5" />
      <circle cx="8" cy="15" r="1" fill="currentColor" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
      <path d="M7 18v2" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 18v2" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 6V3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ============================================================================
// FLIGHT ICON (using PaperAirplaneIcon from Heroicons)
// ============================================================================

export const FlightIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => {
  return (
    <PaperAirplaneIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Flight'}
    />
  );
};

// ============================================================================
// TRANSFER ICON (custom SVG - for mode changes)
// ============================================================================

export const TransferIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Transfer'}
      role="img"
    >
      {/* Transfer/switch icon */}
      <path
        d="M7 16V4M7 4L3 8M7 4l4 4"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8v12M17 20l4-4M17 20l-4-4"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// EXPORT ALL TRANSPORT ICONS
// ============================================================================

export const TransportIcons = {
  Driving: DrivingIcon,
  Walking: WalkingIcon,
  Cycling: CyclingIcon,
  Transit: TransitIcon,
  Flight: FlightIcon,
  Transfer: TransferIcon,
} as const;

// Helper function to get transport icon by mode name
export const getTransportIcon = (mode?: string): React.FC<IconProps> => {
  switch (mode?.toLowerCase()) {
    case 'driving':
    case 'driving-traffic':
      return DrivingIcon;
    case 'walking':
      return WalkingIcon;
    case 'cycling':
      return CyclingIcon;
    case 'transit':
      return TransitIcon;
    case 'flight':
      return FlightIcon;
    case 'transfer':
      return TransferIcon;
    default:
      return DrivingIcon;
  }
};
