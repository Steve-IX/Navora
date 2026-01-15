import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useMapStore } from '@/stores/mapStore';
import { MapLayer } from '@shared/types/map';
import { SegmentedControl, SegmentOption } from '@/components/atoms/SegmentedControl';
import { Toggle } from '@/components/atoms/Toggle';

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
  const { layer, setLayer, trafficEnabled, setTrafficEnabled, show3DBuildings, setShow3DBuildings } = useMapStore();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-4 left-4 z-10"
    >
      <div className="bg-white/70 dark:bg-dark-bg-secondary/60 backdrop-blur-md rounded-xl shadow-elevation-2 dark:shadow-dark-md border border-white/40 dark:border-white/10 overflow-hidden">
        {/* Header with expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-dark-text-primary hover:bg-white/40 dark:hover:bg-dark-bg-tertiary/60 transition-colors"
          aria-expanded={isExpanded}
          aria-controls="layer-control-content"
        >
          <span className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-brand-500" />
            Map Style
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Collapsible content */}
        <motion.div
          id="layer-control-content"
          initial={false}
          animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-3 pb-3 space-y-4">
            {/* Map style segmented control */}
            <SegmentedControl
              options={layerOptions}
              value={layer}
              onChange={(value) => setLayer(value as MapLayer)}
              size="sm"
              fullWidth
              aria-label="Map style"
            />

            {/* Overlay toggles */}
            <div className="space-y-3 pt-2 border-t border-white/40 dark:border-white/10">
              <div className="text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">
                Overlays
              </div>

              <Toggle
                checked={trafficEnabled}
                onChange={setTrafficEnabled}
                label="Traffic"
                size="sm"
              />

              <Toggle
                checked={show3DBuildings}
                onChange={setShow3DBuildings}
                label="3D Buildings"
                size="sm"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
