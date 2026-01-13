import React, { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}

const sizeStyles = {
  sm: {
    container: 'p-0.5 gap-0.5',
    button: 'px-2.5 py-1.5 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    container: 'p-1 gap-1',
    button: 'px-3 py-2 text-sm',
    icon: 'w-4 h-4',
  },
};

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const styles = sizeStyles[size];
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for radio group pattern (arrow keys to change selection)
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const currentIndex = options.findIndex((opt) => opt.value === value);

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        onChange(options[nextIndex].value);
        // Focus the newly selected button
        setTimeout(() => {
          const buttons = containerRef.current?.querySelectorAll('button');
          buttons?.[nextIndex]?.focus();
        }, 0);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        onChange(options[prevIndex].value);
        // Focus the newly selected button
        setTimeout(() => {
          const buttons = containerRef.current?.querySelectorAll('button');
          buttons?.[prevIndex]?.focus();
        }, 0);
        break;
      case 'Home':
        event.preventDefault();
        onChange(options[0].value);
        containerRef.current?.querySelectorAll('button')?.[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        onChange(options[options.length - 1].value);
        containerRef.current?.querySelectorAll('button')?.[options.length - 1]?.focus();
        break;
    }
  }, [options, value, onChange]);

  return (
    <div
      ref={containerRef}
      className={`
        inline-flex items-center
        bg-gray-100 dark:bg-dark-bg-tertiary
        rounded-lg
        ${styles.container}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`
              relative flex items-center justify-center gap-1.5
              rounded-md font-medium
              transition-colors duration-150 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1
              ${styles.button}
              ${fullWidth ? 'flex-1' : ''}
              ${isSelected
                ? 'text-gray-900 dark:text-dark-text-primary'
                : 'text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary'
              }
            `}
          >
            {/* Animated background for selected state */}
            {isSelected && (
              <motion.div
                layoutId="segmented-control-indicator"
                className="absolute inset-0 bg-white dark:bg-dark-bg-secondary rounded-md shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            {/* Content */}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.icon && (
                <span className={styles.icon}>{option.icon}</span>
              )}
              <span>{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
