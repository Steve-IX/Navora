import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

export interface FABGroupProps {
  children: React.ReactNode;
  label?: string;
  direction?: 'vertical' | 'horizontal';
  spacing?: 'sm' | 'md' | 'lg';
  showDivider?: boolean;
  className?: string;
  'aria-label'?: string;
}

const spacingStyles = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-3',
};

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
};

export const FABGroup: React.FC<FABGroupProps> = ({
  children,
  label,
  direction = 'vertical',
  spacing = 'md',
  showDivider = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const childArray = React.Children.toArray(children);

  // Keyboard navigation handler for arrow keys within the toolbar
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const buttons = containerRef.current?.querySelectorAll('button:not([disabled])') as NodeListOf<HTMLButtonElement>;
    if (!buttons || buttons.length === 0) return;

    const currentIndex = Array.from(buttons).findIndex(
      (btn) => btn === document.activeElement
    );

    const isVertical = direction === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    switch (event.key) {
      case prevKey:
        event.preventDefault();
        if (currentIndex > 0) {
          buttons[currentIndex - 1].focus();
        } else {
          buttons[buttons.length - 1].focus(); // Wrap to end
        }
        break;
      case nextKey:
        event.preventDefault();
        if (currentIndex < buttons.length - 1) {
          buttons[currentIndex + 1].focus();
        } else {
          buttons[0].focus(); // Wrap to start
        }
        break;
      case 'Home':
        event.preventDefault();
        buttons[0].focus();
        break;
      case 'End':
        event.preventDefault();
        buttons[buttons.length - 1].focus();
        break;
    }
  }, [direction]);

  return (
    <motion.div
      ref={containerRef}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={`
        flex
        ${direction === 'vertical' ? 'flex-col' : 'flex-row'}
        ${spacingStyles[spacing]}
        ${className}
      `}
      role="toolbar"
      aria-label={ariaLabel || label}
      aria-orientation={direction}
      onKeyDown={handleKeyDown}
    >
      {/* Optional label - shown as small text above/beside group */}
      {label && (
        <span className="sr-only">{label}</span>
      )}

      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          <motion.div variants={itemVariants}>
            {child}
          </motion.div>

          {/* Divider between items if enabled (except after last item) */}
          {showDivider && index < childArray.length - 1 && (
            <div
              className={`
                ${direction === 'vertical' ? 'w-6 h-px mx-auto' : 'h-6 w-px my-auto'}
                bg-gray-200 dark:bg-dark-border-subtle
              `}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      ))}
    </motion.div>
  );
};

// Separator component for visual grouping between FAB groups
export const FABGroupSeparator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`w-8 h-px bg-gray-300 dark:bg-dark-border-default my-2 mx-auto ${className}`}
    aria-hidden="true"
  />
);

export default FABGroup;
