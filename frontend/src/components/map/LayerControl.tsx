import React from 'react';
import { useMapStore } from '@/stores/mapStore';
import { MapLayer } from '@shared/types/map';

const layers: { value: MapLayer; label: string; icon: string }[] = [
  { value: 'standard', label: 'Standard', icon: '🗺️' },
  { value: 'satellite', label: 'Satellite', icon: '🛰️' },
  { value: 'terrain', label: 'Terrain', icon: '⛰️' },
];

export const LayerControl: React.FC = () => {
  const { layer, setLayer, trafficEnabled, setTrafficEnabled } = useMapStore();
  const [show3D, setShow3D] = React.useState(true); // 3D buildings enabled by default

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 z-10">
      <div className="flex flex-col gap-2">
        {layers.map((l) => (
          <button
            key={l.value}
            onClick={() => setLayer(l.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              layer === l.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={`Switch to ${l.label} view`}
          >
            <span className="mr-2">{l.icon}</span>
            {l.label}
          </button>
        ))}
        <div className="border-t pt-2 mt-2 space-y-2">
          <label className="flex items-center gap-2 px-4 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trafficEnabled}
              onChange={(e) => setTrafficEnabled(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Traffic</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={show3D}
              onChange={(e) => {
                setShow3D(e.target.checked);
                // Note: 3D buildings toggle would need MapView integration
                console.log('3D buildings:', e.target.checked);
              }}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">3D Buildings</span>
          </label>
        </div>
      </div>
    </div>
  );
};

