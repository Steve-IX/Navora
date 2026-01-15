import React from 'react';

interface TemperatureDisplayProps {
  value: number;
  unit?: 'C' | 'F';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showUnit?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

export const TemperatureDisplay: React.FC<TemperatureDisplayProps> = ({
  value,
  unit = 'C',
  size = 'md',
  showUnit = true,
  className = '',
}) => {
  const sizeClass = sizeClasses[size];

  return (
    <span className={`font-semibold ${sizeClass} ${className}`}>
      {Math.round(value)}
      {showUnit && (
        <span className="text-slate-500 dark:text-slate-400">°{unit}</span>
      )}
    </span>
  );
};

export default TemperatureDisplay;
