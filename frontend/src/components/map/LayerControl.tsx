import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapIcon,
  GlobeAltIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useMapStore } from '@/stores/mapStore';
import { MapLayer } from '@shared/types/map';
import { SegmentedControl, SegmentOption } from '@/components/atoms/SegmentedControl';
import { Toggle } from '@/components/atoms/Toggle';
import { IconButton } from '@/components/atoms/IconButton';

// Mountain icon for terrain (custom SVG as Heroicons doesn't have one)
const TerrainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l4-8 3 4 5-10 4 14H4z" />
  </svg>
);

const layerOptions: SegmentOption[] = [
  { value: 'standard', label: 'Map', icon: <MapIcon className="w-4 h-4" /> },
  { value: 'satellite', label: 'Satellite', icon: <GlobeAltIcon className="w-4 h-4" /> },
  { value: 'terrain', label: 'Terrain', icon: <TerrainIcon className="w-4 h-4" /> },
];

export const LayerControl: React.FC = () => {
  const {
    layer,
    setLayer,
    trafficEnabled,
    setTrafficEnabled,
    show3DBuildings,
    setShow3DBuildings,
  } = useMapStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = () => {
    setLayer('standard');
    setTrafficEnabled(false);
    setShow3DBuildings(true);
  };

  return (
    <div className="relative">
      <IconButton
        icon={<MapIcon className="w-5 h-5" />}
        onClick={() => setIsOpen(true)}
        tooltip="Layers"
        tooltipPosition="right"
        aria-label="Open layers drawer"
      />

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 240, damping: 30 }}
              className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-dark-bg-secondary shadow-2xl z-40"
              role="dialog"
              aria-modal="true"
              aria-label="Layers drawer"
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-dark-border-default">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-brand-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                      Layers
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                    aria-label="Close layers drawer"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">
                      Basemap
                    </div>
                    <SegmentedControl
                      options={layerOptions}
                      value={layer}
                      onChange={(value) => setLayer(value as MapLayer)}
                      size="sm"
                      fullWidth
                      aria-label="Map style"
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-dark-border-subtle">
                    <div className="text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">
                      Overlays
                    </div>

                    <div className="space-y-1">
                      <Toggle
                        checked={trafficEnabled}
                        onChange={setTrafficEnabled}
                        label="Traffic"
                        size="sm"
                      />
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted pl-1">
                        Traffic (live)
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Toggle
                        checked={show3DBuildings}
                        onChange={setShow3DBuildings}
                        label="3D Buildings"
                        size="sm"
                      />
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted pl-1">
                        3D Buildings (beta)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100 dark:border-dark-border-subtle">
                  <button
                    onClick={handleReset}
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-dark-border-default text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
