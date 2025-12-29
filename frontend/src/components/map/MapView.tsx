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
      
      // Enable 3D buildings
      enable3DBuildings();
      
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
        enable3DBuildings();
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

  // Update markers with clustering support
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const sourceId = 'markers';
    const clusterLayerId = 'clusters';
    const clusterCountLayerId = 'cluster-count';
    const unclusteredPointLayerId = 'unclustered-point';

    // Convert markers to GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: markers.map((marker) => ({
        type: 'Feature',
        properties: {
          id: marker.id,
          title: marker.title || '',
          color: marker.color || '#3b82f6',
        },
        geometry: {
          type: 'Point',
          coordinates: [marker.coordinates.longitude, marker.coordinates.latitude],
        },
      })),
    };

    // Remove existing source if it exists
    if (map.current.getSource(sourceId)) {
      if (map.current.getLayer(clusterLayerId)) map.current.removeLayer(clusterLayerId);
      if (map.current.getLayer(clusterCountLayerId)) map.current.removeLayer(clusterCountLayerId);
      if (map.current.getLayer(unclusteredPointLayerId)) map.current.removeLayer(unclusteredPointLayerId);
      map.current.removeSource(sourceId);
    }

    // Add source with clustering enabled
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
      cluster: markers.length > 10, // Enable clustering if more than 10 markers
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Add cluster circles
    map.current.addLayer({
      id: clusterLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100,
          '#f1f075',
          750,
          '#f28cb1',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
      },
    });

    // Add cluster count labels
    map.current.addLayer({
      id: clusterCountLayerId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
    });

    // Add unclustered points
    map.current.addLayer({
      id: unclusteredPointLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Handle cluster clicks
    const handleClusterClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource;
      
      if (clusterId !== undefined && source.getClusterExpansionZoom) {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom === null || zoom === undefined) return;
          map.current!.easeTo({
            center: (e.lngLat as any) as [number, number],
            zoom: zoom,
          });
        });
      }
    };

    // Handle unclustered point clicks
    const handlePointClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [unclusteredPointLayerId],
      });
      if (features.length > 0) {
        const feature = features[0];
        const title = feature.properties?.title;
        if (title) {
          new mapboxgl.Popup({ offset: 25 })
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${title}</strong>`)
            .addTo(map.current!);
        }
      }
    };

    // Change cursor on hover
    const handleClusterEnter = () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    };
    const handleClusterLeave = () => {
      map.current!.getCanvas().style.cursor = '';
    };
    const handlePointEnter = () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    };
    const handlePointLeave = () => {
      map.current!.getCanvas().style.cursor = '';
    };

    map.current.on('click', clusterLayerId, handleClusterClick);
    map.current.on('click', unclusteredPointLayerId, handlePointClick);
    map.current.on('mouseenter', clusterLayerId, handleClusterEnter);
    map.current.on('mouseleave', clusterLayerId, handleClusterLeave);
    map.current.on('mouseenter', unclusteredPointLayerId, handlePointEnter);
    map.current.on('mouseleave', unclusteredPointLayerId, handlePointLeave);

    return () => {
      if (map.current) {
        map.current.off('click', clusterLayerId, handleClusterClick);
        map.current.off('click', unclusteredPointLayerId, handlePointClick);
        map.current.off('mouseenter', clusterLayerId, handleClusterEnter);
        map.current.off('mouseleave', clusterLayerId, handleClusterLeave);
        map.current.off('mouseenter', unclusteredPointLayerId, handlePointEnter);
        map.current.off('mouseleave', unclusteredPointLayerId, handlePointLeave);
      }
    };
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

  const enable3DBuildings = () => {
    if (!map.current) return;

    // Remove existing 3D buildings layer if it exists
    if (map.current.getLayer('3d-buildings')) {
      map.current.removeLayer('3d-buildings');
    }

    // Add 3D buildings layer (only on standard/satellite styles, not terrain)
    if ((layer === 'standard' || layer === 'satellite') && map.current.getSource('composite')) {
      map.current.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', ['get', 'extrude'], 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height'],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height'],
          ],
          'fill-extrusion-opacity': 0.6,
        },
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {children}
    </div>
  );
};
