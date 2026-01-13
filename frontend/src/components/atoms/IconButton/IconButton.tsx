import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../Tooltip';

export interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  active?: boolean;
  className?: string;
  'aria-label': string;
}

const sizeStyles = {
  sm: 'min-w-[36px] min-h-[36px] p-2',
  md: 'min-w-[44px] min-h-[44px] p-2.5',
  lg: 'min-w-[48px] min-h-[48px] p-3',
};

const variantStyles = {
  default: `
    bg-white dark:bg-dark-bg-secondary
    text-gray-700 dark:text-dark-text-primary
    border border-gray-200 dark:border-dark-border-default
    hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
    hover:border-gray-300 dark:hover:border-dark-border-default
    shadow-sm hover:shadow-md
  `,
  primary: `
    bg-brand-500 dark:bg-brand-600
    text-white
    border border-brand-500 dark:border-brand-600
    hover:bg-brand-600 dark:hover:bg-brand-700
    shadow-md hover:shadow-lg
  `,
  ghost: `
    bg-transparent
    text-gray-600 dark:text-dark-text-secondary
    hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary
    hover:text-gray-900 dark:hover:text-dark-text-primary
  `,
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  tooltip,
  tooltipPosition = 'right',
  variant = 'default',
  size = 'lg',
  disabled = false,
  active = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const button = (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variants={buttonVariants}
      initial="initial"
      whileHover={disabled ? undefined : 'hover'}
      whileTap={disabled ? undefined : 'tap'}
      className={`
        inline-flex items-center justify-center
        rounded-full
        transition-all duration-150 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${active ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/30' : ''}
        ${className}
      `}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        {icon}
      </span>
    </motion.button>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} position={tooltipPosition}>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default IconButton;
