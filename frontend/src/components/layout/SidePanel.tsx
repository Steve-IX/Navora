import React from 'react';

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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed left-0 top-0 h-full bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          widthClasses[width]
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Close panel"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
};

