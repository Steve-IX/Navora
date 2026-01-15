import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/stores/mapStore';
import { useLocationStore } from '@/stores/locationStore';
import { useUIStore } from '@/stores/uiStore';
import { Coordinates } from '@shared/types/geocoding';
import { MapLayer } from '@shared/types/map';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
  onMapClick?: (coordinates: Coordinates) => void;
  onPoiClick?: (poi: { name: string; coordinates: Coordinates; category?: string }) => void;
  children?: React.ReactNode;
}

export const MapView: React.FC<MapViewProps> = ({ onMapClick, onPoiClick, children }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
  const userLocationAccuracySource = useRef<string | null>(null);

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

  const { currentLocation, accuracy, isTracking } = useLocationStore();
  const { darkMode, setMapInteracting } = useUIStore();
  const interactionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is required');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(layer, darkMode),
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

      // Setup POI click handling
      setupPoiClickHandler();
    });

    map.current.on('move', () => {
      if (map.current) {
        const lng = map.current.getCenter().lng;
        const lat = map.current.getCenter().lat;
        setCenter({ longitude: lng, latitude: lat });
        setZoom(map.current.getZoom());
      }
    });

    const handleInteractionStart = () => {
      if (interactionTimeoutRef.current) {
        window.clearTimeout(interactionTimeoutRef.current);
        interactionTimeoutRef.current = null;
      }
      setMapInteracting(true);
    };

    const handleInteractionEnd = () => {
      if (interactionTimeoutRef.current) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
      interactionTimeoutRef.current = window.setTimeout(() => {
        setMapInteracting(false);
      }, 1200);
    };

    map.current.on('movestart', handleInteractionStart);
    map.current.on('moveend', handleInteractionEnd);
    map.current.on('zoomstart', handleInteractionStart);
    map.current.on('zoomend', handleInteractionEnd);

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
      // Check if we clicked on a POI first
      // Only query layers that actually exist in the current style
      const availableLayers = getPoiLayers().filter(layerName => {
        try {
          return map.current?.getLayer(layerName) !== undefined;
        } catch {
          return false;
        }
      });

      if (availableLayers.length === 0) {
        // No POI layers available, just handle as regular map click
        if (onMapClick) {
          onMapClick({
            longitude: e.lngLat.lng,
            latitude: e.lngLat.lat,
          });
        }
        return;
      }

      const features = map.current?.queryRenderedFeatures(e.point, {
        layers: availableLayers,
      });

      if (features && features.length > 0 && onPoiClick) {
        const feature = features[0];
        const name = feature.properties?.name || feature.properties?.name_en || 'Unknown Place';
        const geometry = feature.geometry as GeoJSON.Point;
        
        // Determine category from feature
        let category: string | undefined;
        const maki = feature.properties?.maki;
        const type = feature.properties?.type;
        const poiClass = feature.layer?.id || '';
        
        if (maki) {
          category = mapMakiToCategory(maki);
        } else if (type) {
          category = type;
        } else if (poiClass.includes('poi')) {
          category = 'attraction';
        } else if (poiClass.includes('place')) {
          category = 'place';
        }

        onPoiClick({
          name,
          coordinates: {
            longitude: geometry.coordinates[0],
            latitude: geometry.coordinates[1],
          },
          category,
        });
        return; // Don't propagate to onMapClick
      }

      if (onMapClick) {
        onMapClick({
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
        });
      }
    });

    return () => {
      if (map.current) {
        if (interactionTimeoutRef.current) {
          window.clearTimeout(interactionTimeoutRef.current);
          interactionTimeoutRef.current = null;
        }
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const getPoiLayers = (): string[] => {
    // Common POI layer names in Mapbox styles
    return [
      'poi-label',
      'place-label',
      'airport-label',
      'transit-label',
      'natural-point-label',
      'water-point-label',
    ];
  };

  const mapMakiToCategory = (maki: string): string => {
    const map: Record<string, string> = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      beer: 'bar',
      lodging: 'hotel',
      fuel: 'gas_station',
      parking: 'parking',
      hospital: 'hospital',
      pharmacy: 'pharmacy',
      bank: 'bank',
      grocery: 'supermarket',
      shop: 'shopping',
      attraction: 'attraction',
      museum: 'museum',
      park: 'park',
      garden: 'park',
      fitness: 'gym',
      cinema: 'cinema',
      school: 'school',
      college: 'school',
      airport: 'airport',
      bus: 'bus_station',
      rail: 'train_station',
      marker: 'attraction',
    };
    return map[maki] || 'attraction';
  };

  const setupPoiClickHandler = () => {
    if (!map.current) return;

    const poiLayers = getPoiLayers();
    
    // Check which layers actually exist in the style
    const existingLayers = poiLayers.filter(layer => {
      try {
        return map.current?.getLayer(layer);
      } catch {
        return false;
      }
    });

    existingLayers.forEach(layerId => {
      map.current!.on('mouseenter', layerId, () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current!.on('mouseleave', layerId, () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });
  };

  // Update map style when layer or dark mode changes
  useEffect(() => {
    if (map.current && isLoaded) {
      map.current.setStyle(getMapStyle(layer, darkMode));
      map.current.once('style.load', () => {
        enable3DBuildings();
        if (trafficEnabled) {
          addTrafficLayer();
        }
        setupPoiClickHandler();
      });
    }
  }, [layer, darkMode, isLoaded]);

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
      cluster: markers.length > 10,
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

  // Airport markers ref
  const airportMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Update routes with enhanced styling and airport markers
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

    // Remove existing airport markers
    airportMarkersRef.current.forEach(marker => marker.remove());
    airportMarkersRef.current = [];

    // Add new routes with transport mode styling
    routes.forEach((route) => {
      const sourceId = `route-${route.id}`;
      const layerId = `route-${route.id}-layer`;

      // Determine route color and style based on transport mode
      let routeColor = route.color || '#3b82f6';
      let lineWidth = route.width || 4;

      // Check if route has flight segments
      const hasFlightLegs = route.legs?.some(leg => leg.transportMode === 'flight');
      if (hasFlightLegs) {
        routeColor = '#6366f1'; // Indigo for flights
        lineWidth = 3;
      } else if (route.legs?.some(leg => leg.transportMode === 'walking')) {
        routeColor = '#10b981'; // Green for walking
        lineWidth = 2;
      } else if (route.legs?.some(leg => leg.transportMode === 'transit')) {
        routeColor = '#a855f7'; // Purple for transit
      }

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

      // Add route layer with appropriate styling
      const layerConfig: any = {
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': routeColor,
          'line-width': lineWidth,
        },
      };

      // Add dashed pattern for flight routes if supported
      if (hasFlightLegs) {
        layerConfig.paint['line-dasharray'] = [2, 2];
      }

      map.current!.addLayer(layerConfig);

      // Add airport markers for flight routes
      if (route.flightInfo) {
        // Departure airport marker
        if (route.flightInfo.departureIata) {
          // Find departure airport coordinates from route geometry (first point)
          const departureCoords = route.geometry.coordinates[0];
          if (departureCoords) {
            const airportEl = document.createElement('div');
            airportEl.className = 'airport-marker';
            airportEl.innerHTML = '✈️';
            airportEl.style.fontSize = '20px';
            airportEl.style.cursor = 'pointer';
            
            const airportMarker = new mapboxgl.Marker(airportEl)
              .setLngLat([departureCoords.longitude, departureCoords.latitude])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                  .setHTML(`
                    <div class="p-2">
                      <div class="font-semibold text-sm">${route.flightInfo.departureAirport || 'Departure Airport'}</div>
                      <div class="text-xs text-gray-600">${route.flightInfo.departureIata}</div>
                    </div>
                  `)
              )
              .addTo(map.current!);
            
            airportMarkersRef.current.push(airportMarker);
          }
        }

        // Arrival airport marker
        if (route.flightInfo.arrivalIata) {
          // Find arrival airport coordinates from route geometry (last point)
          const arrivalCoords = route.geometry.coordinates[route.geometry.coordinates.length - 1];
          if (arrivalCoords) {
            const airportEl = document.createElement('div');
            airportEl.className = 'airport-marker';
            airportEl.innerHTML = '✈️';
            airportEl.style.fontSize = '20px';
            airportEl.style.cursor = 'pointer';
            
            const airportMarker = new mapboxgl.Marker(airportEl)
              .setLngLat([arrivalCoords.longitude, arrivalCoords.latitude])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                  .setHTML(`
                    <div class="p-2">
                      <div class="font-semibold text-sm">${route.flightInfo.arrivalAirport || 'Arrival Airport'}</div>
                      <div class="text-xs text-gray-600">${route.flightInfo.arrivalIata}</div>
                    </div>
                  `)
              )
              .addTo(map.current!);
            
            airportMarkersRef.current.push(airportMarker);
          }
        }

        // Add transfer airport markers
        if (route.flightInfo.transfers && route.flightInfo.transfers.length > 0) {
          route.flightInfo.transfers.forEach((transfer, idx) => {
            // Estimate transfer location (middle of route for now)
            // In production, would look up actual airport coordinates
            const midPoint = Math.floor(route.geometry.coordinates.length / 2);
            const transferCoords = route.geometry.coordinates[midPoint + idx];
            
            if (transferCoords) {
              const transferEl = document.createElement('div');
              transferEl.className = 'transfer-marker';
              transferEl.innerHTML = '🔄';
              transferEl.style.fontSize = '18px';
              transferEl.style.cursor = 'pointer';
              
              const transferMarker = new mapboxgl.Marker(transferEl)
                .setLngLat([transferCoords.longitude, transferCoords.latitude])
                .setPopup(
                  new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`
                      <div class="p-2">
                        <div class="font-semibold text-sm">Transfer</div>
                        <div class="text-xs text-gray-600">${transfer.airport || transfer.airportIata}</div>
                        <div class="text-xs text-orange-600 mt-1">Layover: ${Math.round((transfer.layoverDuration || 0) / 60)} min</div>
                      </div>
                    `)
                )
                .addTo(map.current!);
              
              airportMarkersRef.current.push(transferMarker);
            }
          });
        }
      }
    });

    return () => {
      // Cleanup airport markers
      airportMarkersRef.current.forEach(marker => marker.remove());
      airportMarkersRef.current = [];
    };
  }, [routes, isLoaded]);

  // Create custom user location marker element with pulsing animation
  const createUserLocationMarker = (): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4285f4';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';
    
    // Add pulsing animation
    const pulse = document.createElement('div');
    pulse.className = 'user-location-pulse';
    pulse.style.position = 'absolute';
    pulse.style.top = '50%';
    pulse.style.left = '50%';
    pulse.style.transform = 'translate(-50%, -50%)';
    pulse.style.width = '20px';
    pulse.style.height = '20px';
    pulse.style.borderRadius = '50%';
    pulse.style.backgroundColor = '#4285f4';
    pulse.style.opacity = '0.4';
    pulse.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite';
    el.appendChild(pulse);
    
    return el;
  };

  // Update user location marker and accuracy circle
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove existing marker
    if (userLocationMarker.current) {
      userLocationMarker.current.remove();
      userLocationMarker.current = null;
    }

    // Remove existing accuracy circle
    if (userLocationAccuracySource.current) {
      const sourceId = userLocationAccuracySource.current;
      if (map.current.getLayer('user-location-accuracy')) {
        map.current.removeLayer('user-location-accuracy');
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
      userLocationAccuracySource.current = null;
    }

    // Add marker if location is available and tracking
    if (currentLocation && isTracking) {
      const markerEl = createUserLocationMarker();
      userLocationMarker.current = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'center',
      })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map.current);

      // Add accuracy circle if accuracy data is available
      if (accuracy && accuracy > 0) {
        const sourceId = 'user-location-accuracy';
        userLocationAccuracySource.current = sourceId;

        // Convert accuracy (meters) to approximate degrees
        // Rough approximation: 1 degree latitude ≈ 111,000 meters
        const radiusInDegrees = accuracy / 111000;

        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [currentLocation.longitude, currentLocation.latitude],
            },
            properties: {
              radius: radiusInDegrees,
            },
          },
        });

        // Create circle using a buffer (approximation)
        const circle = createCircle([currentLocation.longitude, currentLocation.latitude], radiusInDegrees, 64);
        
        const source = map.current.getSource(sourceId) as mapboxgl.GeoJSONSource;
        if (source && source.setData) {
          source.setData({
            type: 'Feature',
            geometry: circle,
            properties: {},
          } as GeoJSON.Feature);
        }

        if (!map.current.getLayer('user-location-accuracy')) {
          map.current.addLayer({
            id: 'user-location-accuracy',
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#4285f4',
              'fill-opacity': 0.1,
            },
          });

          map.current.addLayer({
            id: 'user-location-accuracy-stroke',
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#4285f4',
              'line-width': 1,
              'line-opacity': 0.3,
            },
          });
        }
      }
    }

    return () => {
      if (userLocationMarker.current) {
        userLocationMarker.current.remove();
        userLocationMarker.current = null;
      }
      if (userLocationAccuracySource.current && map.current) {
        const sourceId = userLocationAccuracySource.current;
        if (map.current.getLayer('user-location-accuracy')) {
          map.current.removeLayer('user-location-accuracy');
        }
        if (map.current.getLayer('user-location-accuracy-stroke')) {
          map.current.removeLayer('user-location-accuracy-stroke');
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
        userLocationAccuracySource.current = null;
      }
    };
  }, [currentLocation, accuracy, isTracking, isLoaded]);

  // Helper function to create a circle polygon
  const createCircle = (center: [number, number], radiusInDegrees: number, points: number = 64): GeoJSON.Polygon => {
    const coordinates: [number, number][] = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const lat = center[1] + radiusInDegrees * Math.cos(angle);
      const lng = center[0] + (radiusInDegrees * Math.sin(angle)) / Math.cos(center[1] * Math.PI / 180);
      coordinates.push([lng, lat]);
    }
    coordinates.push(coordinates[0]); // Close the polygon
    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  };

  const getMapStyle = (layerType: MapLayer, isDark: boolean = false): string => {
    const baseUrl = 'mapbox://styles/mapbox/';

    // Dark mode styles
    if (isDark) {
      const darkStyles: Record<MapLayer, string> = {
        standard: `${baseUrl}dark-v11`,
        satellite: `${baseUrl}satellite-streets-v12`, // Satellite is naturally dark
        terrain: `${baseUrl}dark-v11`, // Use dark style for terrain in dark mode
      };
      return darkStyles[layerType];
    }

    // Light mode styles
    const lightStyles: Record<MapLayer, string> = {
      standard: `${baseUrl}streets-v12`,
      satellite: `${baseUrl}satellite-streets-v12`,
      terrain: `${baseUrl}outdoors-v12`,
    };
    return lightStyles[layerType];
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

    // Add 3D buildings layer
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
      <style>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0.1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
        .user-location-marker {
          position: relative;
        }
        .user-location-pulse {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
