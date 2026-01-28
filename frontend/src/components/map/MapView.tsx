import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/stores/mapStore';
import { useLocationStore } from '@/stores/locationStore';
import { useUIStore } from '@/stores/uiStore';
import { useLiveFlightStore } from '@/stores/liveFlightStore';
import { liveFlightsService } from '@/services/api/liveFlights.service';
import { LiveFlightControls, LiveFlightDetailsPanel } from '@/components/flights';
import { LiveFlightSummary } from '@/types/liveFlights';
import { Coordinates } from '@shared/types/geocoding';
import { MapLayer } from '@shared/types/map';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const LIVE_FLIGHTS_SOURCE_ID = 'live-flights';
const LIVE_FLIGHTS_CLUSTER_LAYER_ID = 'live-flights-clusters';
const LIVE_FLIGHTS_CLUSTER_COUNT_LAYER_ID = 'live-flights-cluster-count';
const LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID = 'live-flights-unclustered';
const LIVE_FLIGHTS_POLL_INTERVAL_MS = 60000; // 60 seconds to reduce API calls and respect rate limits
const LIVE_FLIGHTS_RENDER_INTERVAL_MS = 120;

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
  const { darkMode } = useUIStore();
  const {
    enabled: liveFlightsEnabled,
    filters: liveFlightFilters,
    flights: liveFlights,
    selectedFlight,
    detailsLoading,
    detailsError,
    setFlights,
    setLoading: setLiveFlightsLoading,
    setError: setLiveFlightsError,
    selectFlightId,
    setSelectedFlight,
    setDetailsLoading,
    setDetailsError,
    clearSelection,
    clearFlights,
  } = useLiveFlightStore();

  const liveFlightDataRef = useRef<{
    previous: Map<string, LiveFlightSummary>;
    current: Map<string, LiveFlightSummary>;
    lastUpdateAt: number;
  }>({
    previous: new Map(),
    current: new Map(),
    lastUpdateAt: 0,
  });
  const liveFlightAnimationRef = useRef<number | null>(null);
  const liveFlightRenderRef = useRef<number>(0);

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
      ensureLiveFlightsLayers();
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
      // Check if we clicked on a flight layer first - if so, ignore this click
      // (the flight click handler will handle it)
      const flightLayers = [
        LIVE_FLIGHTS_CLUSTER_LAYER_ID,
        LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID,
      ].filter((layerId) => {
        try {
          return map.current?.getLayer(layerId) !== undefined;
        } catch {
          return false;
        }
      });

      if (flightLayers.length > 0) {
        const flightFeatures = map.current?.queryRenderedFeatures(e.point, {
          layers: flightLayers,
        });
        if (flightFeatures && flightFeatures.length > 0) {
          // Click was on a flight layer - don't trigger POI or map click
          return;
        }
      }

      // Check if we clicked on a POI
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

  const getLiveFlightsBbox = (): string | undefined => {
    if (!map.current) return undefined;
    
    // If zoomed out enough (zoom < 4), use global scope instead of bounding box
    // This provides better coverage and avoids missing flights at map edges
    const currentZoom = map.current.getZoom();
    if (currentZoom < 4) {
      return undefined; // Global scope
    }
    
    const bounds = map.current.getBounds();
    if (!bounds) return undefined;
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    return `${southWest.lat},${southWest.lng},${northEast.lat},${northEast.lng}`;
  };

  const addPlaneIcon = () => {
    if (!map.current || map.current.hasImage('plane-icon')) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(28, 28);
    ctx.lineTo(16, 22);
    ctx.lineTo(4, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    map.current.addImage('plane-icon', imageData);
  };

  const ensureLiveFlightsLayers = () => {
    if (!map.current) return;

    addPlaneIcon();

    if (!map.current.getSource(LIVE_FLIGHTS_SOURCE_ID)) {
      map.current.addSource(LIVE_FLIGHTS_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 55,
      });
    }

    if (!map.current.getLayer(LIVE_FLIGHTS_CLUSTER_LAYER_ID)) {
      map.current.addLayer({
        id: LIVE_FLIGHTS_CLUSTER_LAYER_ID,
        type: 'circle',
        source: LIVE_FLIGHTS_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#38bdf8',
            50,
            '#0ea5e9',
            200,
            '#0284c7',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 50, 24, 200, 30],
          'circle-opacity': 0.85,
        },
      });
    }

    if (!map.current.getLayer(LIVE_FLIGHTS_CLUSTER_COUNT_LAYER_ID)) {
      map.current.addLayer({
        id: LIVE_FLIGHTS_CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: LIVE_FLIGHTS_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
        },
        paint: {
          'text-color': '#0f172a',
        },
      });
    }

    if (!map.current.getLayer(LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID)) {
      map.current.addLayer({
        id: LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID,
        type: 'symbol',
        source: LIVE_FLIGHTS_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'plane-icon',
          'icon-size': 0.7,
          'icon-rotate': ['coalesce', ['get', 'heading'], 0],
          'icon-allow-overlap': true,
          'text-field': ['coalesce', ['get', 'callsign'], ''],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#0f172a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });
    }
  };

  const updateLiveFlightsSource = (features: GeoJSON.Feature[]) => {
    if (!map.current) return;
    const source = map.current.getSource(LIVE_FLIGHTS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source || !source.setData) {
      console.warn('[LiveFlights] Source not available for update');
      return;
    }
    console.log('[LiveFlights] Updating map source with', features.length, 'features');
    source.setData({
      type: 'FeatureCollection',
      features,
    });
  };

  const buildLiveFlightFeatures = (timestamp: number): GeoJSON.Feature[] => {
    const { previous, current, lastUpdateAt } = liveFlightDataRef.current;
    if (current.size === 0) {
      console.log('[LiveFlights] No flights in current map');
      return [];
    }

    const progress = lastUpdateAt
      ? Math.min(1, Math.max(0, (timestamp - lastUpdateAt) / LIVE_FLIGHTS_POLL_INTERVAL_MS))
      : 1;

    const features: GeoJSON.Feature[] = [];
    current.forEach((flight, id) => {
      if (!flight.position) {
        console.log('[LiveFlights] Flight', id, 'has no position');
        return;
      }
      const previousFlight = previous.get(id);
      const currentPosition = flight.position;
      const previousPosition = previousFlight?.position;

      const latitude = previousPosition
        ? previousPosition.latitude + (currentPosition.latitude - previousPosition.latitude) * progress
        : currentPosition.latitude;
      const longitude = previousPosition
        ? previousPosition.longitude + (currentPosition.longitude - previousPosition.longitude) * progress
        : currentPosition.longitude;

      features.push({
        type: 'Feature',
        properties: {
          id: flight.id,
          callsign: flight.callsign ?? flight.flightNumber ?? '',
          heading: flight.position.heading ?? 0,
        },
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      });
    });

    if (features.length > 0) {
      console.log('[LiveFlights] Built', features.length, 'features:', features.map(f => {
        const props = f.properties || {};
        const geom = f.geometry as GeoJSON.Point;
        return `${props.callsign || props.id}: (${geom.coordinates[1]?.toFixed(2)}, ${geom.coordinates[0]?.toFixed(2)})`;
      }));
    }

    return features;
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
        ensureLiveFlightsLayers();
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

  useEffect(() => {
    if (!liveFlightsEnabled) {
      clearFlights();
      clearSelection();
      updateLiveFlightsSource([]);
    }
  }, [liveFlightsEnabled, clearFlights, clearSelection]);

  useEffect(() => {
    if (!liveFlightsEnabled) return;
    if (!map.current || !isLoaded) return;

    let isMounted = true;

    const fetchLiveFlights = async () => {
      setLiveFlightsLoading(true);
      setLiveFlightsError(null);

      try {
        const bbox = getLiveFlightsBbox();
        const currentZoom = map.current?.getZoom() ?? 2;
        
        // Use global scope when zoomed out or when bbox is not available
        const query: Parameters<typeof liveFlightsService.getLiveFlights>[0] = {
          ...(bbox ? { bbox } : { region: 'GLOBAL' }),
          max: currentZoom < 4 ? 500 : 250, // More flights when zoomed out globally
          ...liveFlightFilters,
        };
        
        const response = await liveFlightsService.getLiveFlights(query);
        if (!isMounted) return;
        console.log('[LiveFlights] Received flights:', response.flights.length, response.flights);
        setFlights(response.flights, response.updatedAt, response.stale);
      } catch (error: any) {
        if (!isMounted) return;
        setLiveFlightsError(
          error?.response?.data?.message || error?.message || 'Failed to load live flights',
        );
      }
    };

    fetchLiveFlights();
    const interval = window.setInterval(fetchLiveFlights, LIVE_FLIGHTS_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [liveFlightsEnabled, isLoaded, liveFlightFilters, setFlights, setLiveFlightsLoading, setLiveFlightsError]);

  useEffect(() => {
    if (!liveFlightsEnabled) return;
    const now = Date.now();
    const currentMap = new Map(liveFlights.map((flight) => [flight.id, flight]));
    const previousMap = liveFlightDataRef.current.current;
    console.log('[LiveFlights] Updating flight data ref:', currentMap.size, 'flights');
    liveFlightDataRef.current = {
      previous: previousMap,
      current: currentMap,
      lastUpdateAt: now,
    };
  }, [liveFlights, liveFlightsEnabled]);

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    ensureLiveFlightsLayers();

    const handleClusterClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [LIVE_FLIGHTS_CLUSTER_LAYER_ID],
      });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.current!.getSource(LIVE_FLIGHTS_SOURCE_ID) as mapboxgl.GeoJSONSource;
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

    const handleFlightClick = async (e: mapboxgl.MapLayerMouseEvent) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID],
      });
      if (features.length === 0) return;
      const feature = features[0];
      const flightId = feature.properties?.id;
      if (!flightId) return;
      selectFlightId(flightId);
      setDetailsLoading(true);
      setDetailsError(null);
      const summary = liveFlights.find((flight) => flight.id === flightId);
      if (summary) {
        setSelectedFlight(summary as any);
      }

      try {
        const response = await liveFlightsService.getFlightDetails(flightId);
        setSelectedFlight(response.flight);
        setDetailsLoading(false);
      } catch (error: any) {
        setDetailsError(
          error?.response?.data?.message || error?.message || 'Failed to load flight details',
        );
      }
    };

    const handlePointerEnter = () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    };
    const handlePointerLeave = () => {
      map.current!.getCanvas().style.cursor = '';
    };

    map.current.on('click', LIVE_FLIGHTS_CLUSTER_LAYER_ID, handleClusterClick);
    map.current.on('click', LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID, handleFlightClick);
    map.current.on('mouseenter', LIVE_FLIGHTS_CLUSTER_LAYER_ID, handlePointerEnter);
    map.current.on('mouseleave', LIVE_FLIGHTS_CLUSTER_LAYER_ID, handlePointerLeave);
    map.current.on('mouseenter', LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID, handlePointerEnter);
    map.current.on('mouseleave', LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID, handlePointerLeave);

    const animate = (timestamp: number) => {
      if (!map.current) return;
      if (!liveFlightsEnabled) {
        updateLiveFlightsSource([]);
        return;
      }

      if (timestamp - liveFlightRenderRef.current > LIVE_FLIGHTS_RENDER_INTERVAL_MS) {
        const features = buildLiveFlightFeatures(Date.now());
        updateLiveFlightsSource(features);
        liveFlightRenderRef.current = timestamp;
      }
      liveFlightAnimationRef.current = requestAnimationFrame(animate);
    };

    liveFlightAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (!map.current) return;
      map.current.off('click', LIVE_FLIGHTS_CLUSTER_LAYER_ID, handleClusterClick);
      map.current.off('click', LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID, handleFlightClick);
      map.current.off('mouseenter', LIVE_FLIGHTS_CLUSTER_LAYER_ID, handlePointerEnter);
      map.current.off('mouseleave', LIVE_FLIGHTS_CLUSTER_LAYER_ID, handlePointerLeave);
      map.current.off('mouseenter', LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID, handlePointerEnter);
      map.current.off('mouseleave', LIVE_FLIGHTS_UNCLUSTERED_LAYER_ID, handlePointerLeave);
      if (liveFlightAnimationRef.current) {
        cancelAnimationFrame(liveFlightAnimationRef.current);
        liveFlightAnimationRef.current = null;
      }
    };
  }, [
    isLoaded,
    liveFlightsEnabled,
    liveFlights,
    selectFlightId,
    setDetailsLoading,
    setDetailsError,
    setSelectedFlight,
  ]);

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
      <LiveFlightControls />
      <LiveFlightDetailsPanel
        flight={selectedFlight}
        isLoading={detailsLoading}
        error={detailsError}
        onClose={clearSelection}
      />
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
