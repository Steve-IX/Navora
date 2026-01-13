/**
 * Category Icons
 *
 * Professional place category icons using Heroicons and custom SVG.
 * Replaces emoji category icons with scalable, accessible vector graphics.
 */

import React from 'react';
import {
  MapPinIcon,
  BuildingOffice2Icon,
  ShoppingBagIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  FilmIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

interface IconProps {
  className?: string;
  'aria-label'?: string;
}

// ============================================================================
// GENERIC PLACE ICON
// ============================================================================

export const PlaceIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <MapPinIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Place'}
    />
  );
};

// ============================================================================
// RESTAURANT ICON
// ============================================================================

export const RestaurantIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Restaurant'}
      role="img"
    >
      {/* Fork and knife */}
      <path
        d="M8 3v5a2 2 0 002 2h0a2 2 0 002-2V3M8 3v5a2 2 0 01-2 2H6a2 2 0 01-2-2V3M6 10v11"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 3v7a2 2 0 01-2 2h0a2 2 0 00-2 2v7M16 3v18"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// CAFE / COFFEE ICON
// ============================================================================

export const CafeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Cafe'}
      role="img"
    >
      {/* Coffee cup */}
      <path
        d="M6 8h12a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 10h1a2 2 0 012 2v0a2 2 0 01-2 2h-1"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 16v2a2 2 0 002 2h8a2 2 0 002-2v-2" strokeWidth="1.5" />
      <path d="M8 5l1-2M12 5l1-2M16 5l1-2" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ============================================================================
// BAR ICON
// ============================================================================

export const BarIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Bar'}
      role="img"
    >
      {/* Beer mug */}
      <path
        d="M6 8h10a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2h-2z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 11h1a2 2 0 012 2v1a2 2 0 01-2 2h-1" strokeWidth="1.5" />
      <path d="M8 18v2M16 18v2M10 4v4M14 4v4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ============================================================================
// HOTEL ICON (using BuildingOffice2Icon)
// ============================================================================

export const HotelIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <BuildingOffice2Icon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Hotel'}
    />
  );
};

// ============================================================================
// GAS STATION ICON
// ============================================================================

export const GasStationIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Gas Station'}
      role="img"
    >
      {/* Gas pump */}
      <path
        d="M5 6a2 2 0 012-2h6a2 2 0 012 2v14H5V6z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 10h10" strokeWidth="1.5" />
      <path
        d="M15 12h2a2 2 0 012 2v2a2 2 0 002 2h0a1 1 0 001-1V9l-3-3"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// PARKING ICON
// ============================================================================

export const ParkingIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Parking'}
      role="img"
    >
      {/* P in square */}
      <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" />
      <path
        d="M9 8h4a3 3 0 010 6h-4V8zm0 0v12"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// HOSPITAL / MEDICAL ICON
// ============================================================================

export const HospitalIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <HeartIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Hospital'}
    />
  );
};

// ============================================================================
// PHARMACY ICON
// ============================================================================

export const PharmacyIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Pharmacy'}
      role="img"
    >
      {/* Medical cross */}
      <path d="M12 8v8M8 12h8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
    </svg>
  );
};

// ============================================================================
// BANK ICON
// ============================================================================

export const BankIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <BuildingLibraryIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Bank'}
    />
  );
};

// ============================================================================
// SUPERMARKET / GROCERY ICON
// ============================================================================

export const SupermarketIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Supermarket'}
      role="img"
    >
      {/* Shopping cart */}
      <path
        d="M3 3h2l.5 2m0 0L7 15h10l2-10H5.5z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="19" r="1.5" fill="currentColor" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
};

// ============================================================================
// SHOPPING / MALL ICON (using ShoppingBagIcon)
// ============================================================================

export const ShoppingIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <ShoppingBagIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Shopping'}
    />
  );
};

// ============================================================================
// ATTRACTION / TOURIST ICON
// ============================================================================

export const AttractionIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Attraction'}
      role="img"
    >
      {/* Camera */}
      <path
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" strokeWidth="1.5" />
    </svg>
  );
};

// ============================================================================
// MUSEUM ICON
// ============================================================================

export const MuseumIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <BuildingLibraryIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Museum'}
    />
  );
};

// ============================================================================
// PARK ICON
// ============================================================================

export const ParkIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Park'}
      role="img"
    >
      {/* Tree */}
      <path
        d="M12 3v18M12 8l-3 4h6l-3-4zm-3 4l-2 3h10l-2-3M7 15l-2 3h14l-2-3"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// GYM / FITNESS ICON
// ============================================================================

export const GymIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Gym'}
      role="img"
    >
      {/* Dumbbell */}
      <path d="M7 12h10M5 10h2v4H5zM17 10h2v4h-2z" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="2" y="9" width="2" height="6" rx="1" strokeWidth="1.5" />
      <rect x="20" y="9" width="2" height="6" rx="1" strokeWidth="1.5" />
    </svg>
  );
};

// ============================================================================
// CINEMA / MOVIE THEATER ICON
// ============================================================================

export const CinemaIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <FilmIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'Cinema'}
    />
  );
};

// ============================================================================
// SCHOOL / EDUCATION ICON
// ============================================================================

export const SchoolIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <AcademicCapIcon
      className={className}
      {...props}
      aria-label={props['aria-label'] || 'School'}
    />
  );
};

// ============================================================================
// AIRPORT ICON
// ============================================================================

export const AirportIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Airport'}
      role="img"
    >
      {/* Airplane */}
      <path
        d="M3 12l7-7v4l6 2v-6l2-2 2 2v6l6-2v-4l7 7-7 7v-4l-6-2v6l-2 2-2-2v-6l-6 2v4l-7-7z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(45 12 12)"
      />
    </svg>
  );
};

// ============================================================================
// BUS STATION ICON
// ============================================================================

export const BusStationIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Bus Station'}
      role="img"
    >
      {/* Bus stop sign */}
      <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth="1.5" />
      <path d="M4 10h16" strokeWidth="1.5" />
      <circle cx="8" cy="15" r="1" fill="currentColor" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
      <path d="M12 3v3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ============================================================================
// TRAIN STATION ICON
// ============================================================================

export const TrainStationIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={props['aria-label'] || 'Train Station'}
      role="img"
    >
      {/* Train */}
      <rect x="5" y="6" width="14" height="11" rx="3" strokeWidth="1.5" />
      <path d="M5 11h14" strokeWidth="1.5" />
      <circle cx="9" cy="14" r="1" fill="currentColor" />
      <circle cx="15" cy="14" r="1" fill="currentColor" />
      <path d="M8 17l-2 3M16 17l2 3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ============================================================================
// EXPORT ALL CATEGORY ICONS
// ============================================================================

export const CategoryIcons = {
  Place: PlaceIcon,
  Restaurant: RestaurantIcon,
  Cafe: CafeIcon,
  Bar: BarIcon,
  Hotel: HotelIcon,
  GasStation: GasStationIcon,
  Parking: ParkingIcon,
  Hospital: HospitalIcon,
  Pharmacy: PharmacyIcon,
  Bank: BankIcon,
  Supermarket: SupermarketIcon,
  Shopping: ShoppingIcon,
  Attraction: AttractionIcon,
  Museum: MuseumIcon,
  Park: ParkIcon,
  Gym: GymIcon,
  Cinema: CinemaIcon,
  School: SchoolIcon,
  Airport: AirportIcon,
  BusStation: BusStationIcon,
  TrainStation: TrainStationIcon,
} as const;

// Helper function to get category icon by category name
export const getCategoryIcon = (category?: string): React.FC<IconProps> => {
  if (!category) return PlaceIcon;

  const lower = category.toLowerCase();

  if (lower.includes('restaurant') || lower.includes('food')) return RestaurantIcon;
  if (lower.includes('cafe') || lower.includes('coffee')) return CafeIcon;
  if (lower.includes('bar') || lower.includes('pub')) return BarIcon;
  if (lower.includes('hotel') || lower.includes('lodging')) return HotelIcon;
  if (lower.includes('gas') || lower.includes('fuel')) return GasStationIcon;
  if (lower.includes('parking')) return ParkingIcon;
  if (lower.includes('hospital') || lower.includes('medical')) return HospitalIcon;
  if (lower.includes('pharmacy')) return PharmacyIcon;
  if (lower.includes('bank') || lower.includes('atm')) return BankIcon;
  if (lower.includes('supermarket') || lower.includes('grocery')) return SupermarketIcon;
  if (lower.includes('shopping') || lower.includes('mall')) return ShoppingIcon;
  if (lower.includes('attraction') || lower.includes('tourist')) return AttractionIcon;
  if (lower.includes('museum')) return MuseumIcon;
  if (lower.includes('park') || lower.includes('nature')) return ParkIcon;
  if (lower.includes('gym') || lower.includes('fitness')) return GymIcon;
  if (lower.includes('cinema') || lower.includes('movie')) return CinemaIcon;
  if (lower.includes('school') || lower.includes('education')) return SchoolIcon;
  if (lower.includes('airport')) return AirportIcon;
  if (lower.includes('bus')) return BusStationIcon;
  if (lower.includes('train') || lower.includes('metro')) return TrainStationIcon;

  return PlaceIcon;
};
