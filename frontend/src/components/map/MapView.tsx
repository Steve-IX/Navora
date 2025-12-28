import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/stores/mapStore';
import { Coordinates } from '@shared/types/geocoding';
import { MapLayer } from '@shared/types/map';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
  onMapClick?: (coordinates: Coordinates) => void;
  children?: React.ReactNode;
}

export const MapView: React.FC<MapViewProps> = ({ onMapClick, children }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const {
    center,
    zoom,
    bearing,
    pitch,
    layer,
    trafficEnabled,
    markers,
    routes,
    setCenter,
    setZoom,
    setBearing,
    setPitch,
  } = useMapStore();

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is required');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(layer),
      center: [center.longitude, center.latitude],
      zoom: zoom,
      bearing: bearing,
      pitch: pitch,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      setIsLoaded(true);
      if (trafficEnabled) {
        addTrafficLayer();
      }
    });

    map.current.on('move', () => {
      if (map.current) {
        const lng = map.current.getCenter().lng;
        const lat = map.current.getCenter().lat;
        setCenter({ longitude: lng, latitude: lat });
        setZoom(map.current.getZoom());
      }
    });

    map.current.on('rotate', () => {
      if (map.current) {
        setBearing(map.current.getBearing());
      }
    });

    map.current.on('pitch', () => {
      if (map.current) {
        setPitch(map.current.getPitch());
      }
    });

    map.current.on('click', (e) => {
      if (onMapClick) {
        onMapClick({
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
        });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map style when layer changes
  useEffect(() => {
    if (map.current && isLoaded) {
      map.current.setStyle(getMapStyle(layer));
      map.current.once('style.load', () => {
        if (trafficEnabled) {
          addTrafficLayer();
        }
      });
    }
  }, [layer, isLoaded]);

  // Update traffic layer
  useEffect(() => {
    if (map.current && isLoaded) {
      if (trafficEnabled) {
        addTrafficLayer();
      } else {
        removeTrafficLayer();
      }
    }
  }, [trafficEnabled, isLoaded]);

  // Update center when store changes (but not from map move events)
  useEffect(() => {
    if (map.current && isLoaded) {
      const currentCenter = map.current.getCenter();
      if (
        Math.abs(currentCenter.lng - center.longitude) > 0.0001 ||
        Math.abs(currentCenter.lat - center.latitude) > 0.0001
      ) {
        map.current.flyTo({
          center: [center.longitude, center.latitude],
          zoom: zoom,
          bearing: bearing,
          pitch: pitch,
        });
      }
    }
  }, [center, zoom, bearing, pitch, isLoaded]);

  // Update markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove all existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach((marker) => marker.remove());

    // Add new markers
    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.backgroundColor = marker.color || '#3b82f6';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.title = marker.title || '';

      const popup = marker.title
        ? new mapboxgl.Popup({ offset: 25 }).setText(marker.title)
        : undefined;

      new mapboxgl.Marker(el)
        .setLngLat([marker.coordinates.longitude, marker.coordinates.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [markers, isLoaded]);

  // Update routes
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove existing route sources and layers
    routes.forEach((route) => {
      const sourceId = `route-${route.id}`;
      if (map.current!.getSource(sourceId)) {
        if (map.current!.getLayer(`route-${route.id}-layer`)) {
          map.current!.removeLayer(`route-${route.id}-layer`);
        }
        map.current!.removeSource(sourceId);
      }
    });

    // Add new routes
    routes.forEach((route) => {
      const sourceId = `route-${route.id}`;
      const layerId = `route-${route.id}-layer`;

      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.geometry.coordinates.map((coord) => [
              coord.longitude,
              coord.latitude,
            ]),
          },
        },
      });

      map.current!.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': route.color || '#3b82f6',
          'line-width': route.width || 4,
        },
      });
    });
  }, [routes, isLoaded]);

  const getMapStyle = (layerType: MapLayer): string => {
    const baseUrl = 'mapbox://styles/mapbox/';
    const styles: Record<MapLayer, string> = {
      standard: `${baseUrl}streets-v12`,
      satellite: `${baseUrl}satellite-streets-v12`,
      terrain: `${baseUrl}outdoors-v12`,
    };
    return styles[layerType];
  };

  const addTrafficLayer = () => {
    if (!map.current) return;

    if (!map.current.getSource('traffic')) {
      map.current.addSource('traffic', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-traffic-v1',
      });
    }

    if (!map.current.getLayer('traffic-layer')) {
      map.current.addLayer({
        id: 'traffic-layer',
        type: 'line',
        source: 'traffic',
        'source-layer': 'traffic',
        paint: {
          'line-width': 2,
          'line-color': [
            'case',
            ['==', ['get', 'congestion'], 'low'],
            '#00ff00',
            ['==', ['get', 'congestion'], 'moderate'],
            '#ffff00',
            ['==', ['get', 'congestion'], 'heavy'],
            '#ff0000',
            ['==', ['get', 'congestion'], 'severe'],
            '#8b0000',
            '#0000ff',
          ],
        },
      });
    }
  };

  const removeTrafficLayer = () => {
    if (!map.current) return;

    if (map.current.getLayer('traffic-layer')) {
      map.current.removeLayer('traffic-layer');
    }
    if (map.current.getSource('traffic')) {
      map.current.removeSource('traffic');
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {children}
    </div>
  );
};

