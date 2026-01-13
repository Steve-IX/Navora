import React from 'react';
import { motion } from 'framer-motion';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  id?: string;
}

const sizeStyles = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translateX(16px)',
    labelSize: 'text-sm',
    descSize: 'text-xs',
  },
  md: {
    track: 'w-10 h-5',
    thumb: 'w-4 h-4',
    translate: 'translateX(20px)',
    labelSize: 'text-sm',
    descSize: 'text-xs',
  },
};

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  size = 'md',
  disabled = false,
  className = '',
  id,
}) => {
  const styles = sizeStyles[size];
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        aria-labelledby={label ? `${toggleId}-label` : undefined}
        aria-describedby={description ? `${toggleId}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex items-center shrink-0
          rounded-full
          transition-colors duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${styles.track}
          ${checked
            ? 'bg-brand-500 dark:bg-brand-600'
            : 'bg-gray-200 dark:bg-dark-bg-tertiary'
          }
        `}
      >
        <motion.span
          className={`
            inline-block rounded-full
            bg-white shadow-sm
            ${styles.thumb}
          `}
          initial={false}
          animate={{
            x: checked ? (size === 'sm' ? 16 : 20) : 2,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              id={`${toggleId}-label`}
              htmlFor={toggleId}
              className={`
                font-medium cursor-pointer
                text-gray-900 dark:text-dark-text-primary
                ${styles.labelSize}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {label}
            </label>
          )}
          {description && (
            <span
              id={`${toggleId}-desc`}
              className={`
                text-gray-500 dark:text-dark-text-muted
                ${styles.descSize}
              `}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Toggle;
