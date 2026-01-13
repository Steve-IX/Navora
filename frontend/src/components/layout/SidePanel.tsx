import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { backdropFade, sidePanel, smoothSpring, buttonHover, buttonTap } from '@/utils/animations';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  children,
  title,
  width = 'md',
}) => {
  const widthClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[28rem]',
    xl: 'w-[32rem]',
  };

  // Handle ESC key to close panel
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropFade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 backdrop-blur-sm z-30"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Side Panel */}
          <motion.div
            variants={sidePanel}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={smoothSpring}
            className={`fixed left-0 top-0 h-full bg-white dark:bg-dark-bg-secondary shadow-2xl z-40 ${widthClasses[width]}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'side-panel-title' : undefined}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border-default bg-white dark:bg-dark-bg-secondary">
                  <h2
                    id="side-panel-title"
                    className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary"
                  >
                    {title}
                  </h2>
                  <motion.button
                    whileHover={buttonHover}
                    whileTap={buttonTap}
                    onClick={onClose}
                    className="text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1"
                    aria-label="Close panel"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </motion.button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-bg-primary">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

