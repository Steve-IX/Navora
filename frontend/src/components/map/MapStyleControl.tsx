import React from 'react';
import { useMapStore } from '@/stores/mapStore';

// Custom map styles (Mapbox style URLs or custom styles)
const customStyles: Array<{ id: string; name: string; styleUrl: string }> = [
  { id: 'dark', name: 'Dark', styleUrl: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light', name: 'Light', styleUrl: 'mapbox://styles/mapbox/light-v11' },
  { id: 'navigation-day', name: 'Navigation Day', styleUrl: 'mapbox://styles/mapbox/navigation-day-v1' },
  { id: 'navigation-night', name: 'Navigation Night', styleUrl: 'mapbox://styles/mapbox/navigation-night-v1' },
];

export const MapStyleControl: React.FC = () => {
  const { layer, setLayer } = useMapStore();
  const [showCustomStyles, setShowCustomStyles] = React.useState(false);

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-10">
      <div className="flex flex-col gap-2">
        {/* Standard styles */}
        <div className="flex gap-2">
          <button
            onClick={() => setLayer('standard')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              layer === 'standard'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Standard Map"
          >
            🗺️
          </button>
          <button
            onClick={() => setLayer('satellite')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              layer === 'satellite'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Satellite"
          >
            🛰️
          </button>
          <button
            onClick={() => setLayer('terrain')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              layer === 'terrain'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Terrain"
          >
            ⛰️
          </button>
        </div>

        {/* Custom styles button */}
        <button
          onClick={() => setShowCustomStyles(!showCustomStyles)}
          className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          title="More Styles"
        >
          {showCustomStyles ? '▼' : '▶'} Styles
        </button>

        {/* Custom styles menu */}
        {showCustomStyles && (
          <div className="border-t pt-2 mt-2 space-y-1">
            {customStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  // For custom styles, we'd need to extend MapLayer type or use a different approach
                  // For now, just show the option (would need MapView integration)
                  console.log('Custom style selected:', style);
                  setShowCustomStyles(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {style.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

