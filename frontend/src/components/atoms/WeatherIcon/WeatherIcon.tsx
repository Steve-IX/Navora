import React from 'react';
import {
  SunIcon,
  CloudIcon,
  MoonIcon,
} from '@heroicons/react/24/solid';
import { WeatherCondition } from '@shared/types/weather';

interface WeatherIconProps {
  condition: WeatherCondition;
  isDay?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

// Weather condition to color mapping
const colorClasses: Record<WeatherCondition, string> = {
  sunny: 'text-yellow-400',
  clear: 'text-yellow-400',
  'partly-cloudy': 'text-sky-400',
  cloudy: 'text-slate-400',
  overcast: 'text-slate-500',
  mist: 'text-slate-400',
  fog: 'text-slate-400',
  drizzle: 'text-blue-400',
  rain: 'text-blue-500',
  'heavy-rain': 'text-blue-600',
  thunderstorm: 'text-purple-500',
  snow: 'text-cyan-300',
  'heavy-snow': 'text-cyan-400',
  sleet: 'text-blue-300',
  hail: 'text-slate-300',
  blizzard: 'text-cyan-200',
};

// SVG components for weather conditions not in Heroicons
const RainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.11 2 6.6 3.64 5.35 6.04C2.34 6.36 0 8.91 0 12c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96C18.67 4.59 15.64 2 12 2zM12 4c2.69 0 4.94 2 5.32 4.59l.15.83l.83.1c1.58.17 2.7 1.54 2.7 3.13C21 14.47 19.47 16 18 16H6c-2.21 0-4-1.79-4-4c0-2.05 1.53-3.76 3.56-3.97l.83-.09l.29-.79C7.58 4.87 9.64 4 12 4z"/>
    <path d="M8 19l-2 3M12 19l-2 3M16 19l-2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const SnowIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.11 2 6.6 3.64 5.35 6.04C2.34 6.36 0 8.91 0 12c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96C18.67 4.59 15.64 2 12 2z"/>
    <circle cx="8" cy="20" r="1" fill="currentColor"/>
    <circle cx="12" cy="21" r="1" fill="currentColor"/>
    <circle cx="16" cy="20" r="1" fill="currentColor"/>
    <circle cx="10" cy="19" r="0.8" fill="currentColor"/>
    <circle cx="14" cy="19" r="0.8" fill="currentColor"/>
  </svg>
);

const ThunderstormIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.11 2 6.6 3.64 5.35 6.04C2.34 6.36 0 8.91 0 12c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96C18.67 4.59 15.64 2 12 2z"/>
    <path d="M13 16l-3 5h3l-1 3l4-5h-3l1-3z" fill="#facc15"/>
  </svg>
);

const FogIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 15h18v2H3zM3 19h12v2H3zM3 11h18v2H3zM3 7h14v2H3z" opacity="0.7"/>
  </svg>
);

const PartlyCloudyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="8" cy="8" r="4" fill="#facc15"/>
    <path d="M14 10c-1.5 0-2.91.8-3.68 2.04C8.22 12.18 6.5 14.03 6.5 16.25c0 2.35 1.9 4.25 4.25 4.25h8.5c1.93 0 3.5-1.57 3.5-3.5c0-1.84-1.43-3.34-3.24-3.47C19.14 11.51 16.78 10 14 10z" fill="currentColor"/>
  </svg>
);

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  condition,
  isDay = true,
  size = 'md',
  className = '',
}) => {
  const sizeClass = sizeClasses[size];
  const colorClass = colorClasses[condition] || 'text-slate-400';
  const combinedClassName = `${sizeClass} ${colorClass} ${className}`;

  // Determine which icon to render based on condition
  switch (condition) {
    case 'sunny':
    case 'clear':
      return isDay ? (
        <SunIcon className={combinedClassName} />
      ) : (
        <MoonIcon className={`${sizeClass} text-slate-300 ${className}`} />
      );

    case 'partly-cloudy':
      return <PartlyCloudyIcon className={combinedClassName} />;

    case 'cloudy':
    case 'overcast':
      return <CloudIcon className={combinedClassName} />;

    case 'mist':
    case 'fog':
      return <FogIcon className={combinedClassName} />;

    case 'drizzle':
    case 'rain':
    case 'heavy-rain':
      return <RainIcon className={combinedClassName} />;

    case 'thunderstorm':
      return <ThunderstormIcon className={combinedClassName} />;

    case 'snow':
    case 'heavy-snow':
    case 'sleet':
    case 'hail':
    case 'blizzard':
      return <SnowIcon className={combinedClassName} />;

    default:
      return <CloudIcon className={combinedClassName} />;
  }
};

export default WeatherIcon;
