import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinates, TripPlan, VisualizationMode, Flight, Place } from '../types';
import { createStartIcon, createEndIcon, createCheckpointIcon, createAirportIcon, createPlaneIcon, createPlaceIcon } from '../utils/mapIcons';
import { VisualSegment } from '../hooks/useVisualizerLogic';
import { MAJOR_AIRPORTS, interpolateGeodesic } from '../utils/flightUtils';

interface MapLayerProps {
    center: Coordinates;
    mode: VisualizationMode;
    startPoint: Coordinates | null;
    endPoint: Coordinates | null;
    currentPlan: TripPlan | null;
    visualSegments: VisualSegment[];
    activeFlights: Flight[];
    selectedFlightId: string | null;
    onFlightSelect: (id: string) => void;
    calculating: boolean;
    onMapClick: (coords: Coordinates) => void;
    flyToCoords: Coordinates | null;
    nearbyPlaces?: Place[];
    radarTimestamp?: number | null; 
}

export const MapLayer: React.FC<MapLayerProps> = ({ 
    center, mode, startPoint, endPoint, currentPlan, visualSegments, activeFlights, selectedFlightId, onFlightSelect, calculating, onMapClick, flyToCoords, nearbyPlaces, radarTimestamp
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const routeLayerRef = useRef<L.LayerGroup | null>(null);
    const flightLayerRef = useRef<L.LayerGroup | null>(null);
    const placesLayerRef = useRef<L.LayerGroup | null>(null);
    const radarLayerRef = useRef<L.TileLayer | null>(null);
    const markersRef = useRef<{start?: L.Marker, end?: L.Marker, checkpoints: L.Marker[]}>({ checkpoints: [] });
    
    // Store flight markers
    const flightMarkersRef = useRef<Map<string, { marker: L.Marker, selected: boolean }>>(new Map());

    // Ref for onMapClick to avoid stale closures in Leaflet event listener
    const onMapClickRef = useRef(onMapClick);

    useEffect(() => {
        onMapClickRef.current = onMapClick;
    }, [onMapClick]);

    // Styles
    const styles = {
        tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    };

    // 1. Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
            doubleClickZoom: false,
            dragging: true,
            scrollWheelZoom: true,
            minZoom: 2,
        }).setView([center.lat, center.lng], 15);

        L.tileLayer(styles.tileUrl, { maxZoom: 20, subdomains: 'abcd', attribution: '&copy; CARTO' }).addTo(map);

        routeLayerRef.current = L.layerGroup().addTo(map);
        flightLayerRef.current = L.layerGroup().addTo(map);
        placesLayerRef.current = L.layerGroup().addTo(map);

        map.on('click', (e) => {
            if (onMapClickRef.current) {
                onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // 2. Handle FlyTo Trigger
    useEffect(() => {
        if (mapRef.current && flyToCoords) {
            mapRef.current.flyTo([flyToCoords.lat, flyToCoords.lng], 15, { animate: true, duration: 1.5 });
        }
    }, [flyToCoords]);

    // 3. Handle Mode Switching & Cleanup & Weather Tiles
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear layers
        routeLayerRef.current?.clearLayers();
        flightLayerRef.current?.clearLayers();
        placesLayerRef.current?.clearLayers();
        markersRef.current.start?.remove();
        markersRef.current.end?.remove();
        markersRef.current.checkpoints.forEach(m => m.remove());
        flightMarkersRef.current.clear();
        
        // Handle Radar Layer
        if (radarLayerRef.current) {
            radarLayerRef.current.remove();
            radarLayerRef.current = null;
        }

        if (mode === 'FLIGHT') {
             map.flyTo([center.lat, center.lng], 8, { duration: 1.5 });
        } else if (mode === 'WEATHER') {
             // Zoom out slightly for weather view if switching
             map.flyTo([center.lat, center.lng], 6, { duration: 1.5 });
             if (radarTimestamp) {
                const radarUrl = `https://tile.rainviewer.com/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`;
                radarLayerRef.current = L.tileLayer(radarUrl, {
                    opacity: 0.8,
                    maxZoom: 19,
                    attribution: 'RainViewer'
                }).addTo(map);
             }
        } else if (mode === 'ROUTING' || mode === 'EXPLORE') {
            if (startPoint) map.flyTo([startPoint.lat, startPoint.lng], 15);
            else map.flyTo([center.lat, center.lng], 15);
        }

    }, [mode, radarTimestamp]);

    // 4. FLIGHT RENDERER (Efficient Updates)
    useEffect(() => {
        if (mode !== 'FLIGHT' || !flightLayerRef.current) return;

        const layerGroup = flightLayerRef.current;
        const currentIds = new Set(activeFlights.map(f => f.id));

        // Remove old flights
        for (const [id, visuals] of flightMarkersRef.current.entries()) {
            if (!currentIds.has(id)) {
                visuals.marker.remove();
                flightMarkersRef.current.delete(id);
            }
        }

        // Update or Create
        activeFlights.forEach(flight => {
            const isSelected = selectedFlightId === flight.id;

            if (flightMarkersRef.current.has(flight.id)) {
                // Update
                const visuals = flightMarkersRef.current.get(flight.id)!;
                visuals.marker.setLatLng([flight.currentPos.lat, flight.currentPos.lng]);
                visuals.marker.setIcon(createPlaneIcon(flight.heading, flight.airlineCode, isSelected));
                visuals.selected = isSelected;
            } else {
                // Create
                const marker = L.marker(
                    [flight.currentPos.lat, flight.currentPos.lng], 
                    { icon: createPlaneIcon(flight.heading, flight.airlineCode, isSelected) }
                ).addTo(layerGroup);
                
                marker.on('click', () => {
                    onFlightSelect(flight.id);
                    L.DomEvent.stopPropagation(null as any); 
                });

                flightMarkersRef.current.set(flight.id, { marker, selected: isSelected });
            }
        });

    }, [activeFlights, mode, selectedFlightId]);

    // 5. PLACES RENDERER (Explore Mode)
    useEffect(() => {
        if (mode !== 'EXPLORE' || !placesLayerRef.current) return;
        placesLayerRef.current.clearLayers();
        if (nearbyPlaces) {
            nearbyPlaces.forEach(place => {
                L.marker([place.coordinates.lat, place.coordinates.lng], { 
                    icon: createPlaceIcon(place.name, place.category) 
                }).addTo(placesLayerRef.current!);
            });
        }
    }, [mode, nearbyPlaces]);

    // 6. SHARED MARKERS
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        // Start Marker (Used for Routing Start, Explore Center, Weather Center)
        if (startPoint && (mode === 'ROUTING' || mode === 'EXPLORE' || mode === 'WEATHER')) {
            if (markersRef.current.start) markersRef.current.start.setLatLng([startPoint.lat, startPoint.lng]).addTo(map);
            else markersRef.current.start = L.marker([startPoint.lat, startPoint.lng], { icon: createStartIcon() }).addTo(map);
        } else if (markersRef.current.start) {
            markersRef.current.start.remove();
        }

        // End Marker & Lines
        if (mode === 'ROUTING' || mode === 'EXPLORE') {
            if (endPoint) {
                if (markersRef.current.end) markersRef.current.end.setLatLng([endPoint.lat, endPoint.lng]).addTo(map);
                else markersRef.current.end = L.marker([endPoint.lat, endPoint.lng], { icon: createEndIcon() }).addTo(map);
            } else if (markersRef.current.end) {
                markersRef.current.end.remove();
            }

            markersRef.current.checkpoints.forEach(m => m.remove());
            markersRef.current.checkpoints = [];
            
            if (currentPlan && mode === 'ROUTING') {
                currentPlan.segments.forEach((seg, i) => {
                    const m = L.marker([seg.coordinates.lat, seg.coordinates.lng], { icon: createCheckpointIcon(i, seg.mode) }).addTo(map);
                    markersRef.current.checkpoints.push(m);
                });
            }

            routeLayerRef.current?.clearLayers();
            if (visualSegments.length > 0) {
                const allCoords: [number, number][] = [];
                visualSegments.forEach(seg => {
                    allCoords.push(...seg.coordinates);
                    L.polyline(seg.coordinates, {
                        color: seg.mode === 'AIR' ? '#3b82f6' : '#d946ef',
                        weight: 5,
                        opacity: seg.mode === 'AIR' ? 0.6 : 0.9,
                        dashArray: seg.mode === 'AIR' ? '10, 10' : undefined,
                        lineCap: 'round', lineJoin: 'round'
                    }).addTo(routeLayerRef.current!);
                });

                if (allCoords.length > 0 && (calculating || mode === 'EXPLORE')) {
                    map.fitBounds(L.latLngBounds(allCoords), { padding: [80, 80], animate: true });
                }
            }
        }
    }, [mode, startPoint, endPoint, currentPlan, visualSegments, calculating]);

    return (
        <div className="absolute inset-0 z-0">
             <div ref={mapContainerRef} className={`absolute inset-0 z-0 cursor-crosshair grayscale-[0.2] contrast-[1.1]`} />
        </div>
    );
};