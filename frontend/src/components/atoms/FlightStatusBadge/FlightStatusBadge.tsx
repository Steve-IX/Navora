import React from 'react';

type FlightStatus =
  | 'scheduled'
  | 'active'
  | 'landed'
  | 'cancelled'
  | 'incident'
  | 'diverted'
  | 'delayed'
  | 'unknown';

interface FlightStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<FlightStatus, { label: string; classes: string }> = {
  scheduled: {
    label: 'Scheduled',
    classes:
      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  },
  active: {
    label: 'In Flight',
    classes: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  },
  landed: {
    label: 'Landed',
    classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  incident: {
    label: 'Incident',
    classes:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  },
  diverted: {
    label: 'Diverted',
    classes:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  delayed: {
    label: 'Delayed',
    classes:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  },
  unknown: {
    label: 'Unknown',
    classes:
      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  },
};

export const FlightStatusBadge: React.FC<FlightStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const normalizedStatus = status.toLowerCase() as FlightStatus;
  const config = statusConfig[normalizedStatus] || statusConfig.unknown;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        rounded-full text-xs font-medium
        ${config.classes} ${className}
      `}
    >
      {config.label}
    </span>
  );
};

export default FlightStatusBadge;
