import { useState, useEffect, useRef } from 'react';
import { Coordinates, TripPlan, HistoryItem, VisualizationMode, Flight, Place, FlightRegion } from '../types';
import { geocodeLocation, planTripLogistics, searchNearbyPlaces } from '../services/geminiService';
import { fetchRoute } from '../services/osmService';
import { fetchOpenSkyFlights, getAirlineFromCallsign, projectPosition } from '../utils/flightUtils';

export interface VisualSegment {
    coordinates: [number, number][];
    mode: 'GROUND' | 'AIR';
}

const LIVE_UPDATE_INTERVAL_MS = 20000; // Safe for OpenSky (20s)
const INTERPOLATION_INTERVAL_MS = 50; // Smooth movement update
const MAX_GLOBAL_FLIGHTS = 3000; // Performance cap for global mode

export const useVisualizerLogic = () => {
    const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('ROUTING');
    
    // Routing State
    const [startPoint, setStartPoint] = useState<Coordinates | null>(null);
    const [endPoint, setEndPoint] = useState<Coordinates | null>(null);
    const [startLabel, setStartLabel] = useState<string>("");
    const [endLabel, setEndLabel] = useState<string>("");
    const [calculating, setCalculating] = useState(false);
    
    // Explore Mode State
    const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
    const [searchingPlaces, setSearchingPlaces] = useState(false);
    const [exploreCategory, setExploreCategory] = useState("");

    // Data State
    const [routeOptions, setRouteOptions] = useState<TripPlan[]>([]);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
    const [visualSegments, setVisualSegments] = useState<VisualSegment[]>([]);

    // Flight Tracker State
    const [activeFlights, setActiveFlights] = useState<Flight[]>([]);
    const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
    const [flightRegion, setFlightRegion] = useState<FlightRegion>('GLOBAL');
    
    const flightFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flightInterpolationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Store master list in Ref to avoid massive re-renders during processing
    const masterFlightListRef = useRef<Flight[]>([]);

    // History State
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            const saved = localStorage.getItem('smartpath_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('smartpath_history', JSON.stringify(history));
    }, [history]);

    const currentPlan = routeOptions[selectedOptionIndex] || null;
    const selectedFlight = activeFlights.find(f => f.id === selectedFlightId) || null;

    // --- FLIGHT LIVE DATA ENGINE ---
    useEffect(() => {
        if (visualizationMode === 'FLIGHT') {
            
            const fetchFlights = async () => {
                const rawStates = await fetchOpenSkyFlights(flightRegion);
                
                // Process Raw Data
                const processedFlights = rawStates.map((state: any) => {
                    // OpenSky format: 
                    // 0: icao24, 1: callsign, 2: origin_country, 5: lng, 6: lat, 
                    // 7: baro_altitude, 8: on_ground, 9: velocity, 10: true_track
                    const lat = state[6];
                    const lng = state[5];

                    // Filter invalid coordinates
                    if (lat === null || lng === null) return null;

                    const icao24 = state[0];
                    // If we already have this flight, preserve its ID/info to avoid flicker? 
                    // Actually, for smoothness, we just overwrite and let the renderer handle diffs via ID.
                    
                    const callsign = state[1]?.trim() || "N/A";
                    const velocityMs = state[9] || 0;
                    const heading = state[10] || 0;
                    const altitudeM = state[7] || 0;
                    const onGround = state[8];
                    const originCountry = state[2];

                    const { code, info } = getAirlineFromCallsign(callsign);

                    return {
                        id: icao24,
                        flightNumber: callsign,
                        airlineCode: code,
                        airline: info,
                        originCountry: originCountry,
                        currentPos: { lat, lng },
                        heading: heading,
                        speed: velocityMs * 3.6, // Convert m/s to km/h
                        altitude: altitudeM * 3.28084, // Convert m to ft
                        onGround: onGround,
                        aircraft: "Unknown Aircraft", 
                        lastUpdate: Date.now()
                    } as Flight;
                }).filter(Boolean) as Flight[];

                // Cap the list if Global to prevent browser crash
                let finalFlights = processedFlights;
                if (flightRegion === 'GLOBAL' && processedFlights.length > MAX_GLOBAL_FLIGHTS) {
                    // Simple logic: Take first N. 
                    // Advanced: Could prioritize by altitude or speed (active flights)
                    finalFlights = processedFlights.slice(0, MAX_GLOBAL_FLIGHTS);
                }

                masterFlightListRef.current = finalFlights;
                setActiveFlights(finalFlights);
            };

            // Initial Fetch
            fetchFlights();

            // Poll for updates (Every 20s)
            flightFetchRef.current = setInterval(fetchFlights, LIVE_UPDATE_INTERVAL_MS);

            // Client-side Interpolation (Smooth Movement Every 50ms)
            flightInterpolationRef.current = setInterval(() => {
                setActiveFlights(prev => {
                    // Update positions based on velocity
                    return prev.map(f => {
                         // Don't interpolate if on ground or very slow
                        if (f.onGround || f.speed < 10) return f;

                        const timeHours = INTERPOLATION_INTERVAL_MS / 1000 / 3600;
                        const distKm = f.speed * timeHours;

                        const newPos = projectPosition(f.currentPos.lat, f.currentPos.lng, f.heading, distKm);

                        return {
                            ...f,
                            currentPos: newPos
                        };
                    });
                });
            }, INTERPOLATION_INTERVAL_MS);

        } else {
            if (flightFetchRef.current) clearInterval(flightFetchRef.current);
            if (flightInterpolationRef.current) clearInterval(flightInterpolationRef.current);
            setSelectedFlightId(null);
        }

        return () => {
            if (flightFetchRef.current) clearInterval(flightFetchRef.current);
            if (flightInterpolationRef.current) clearInterval(flightInterpolationRef.current);
        };
    }, [visualizationMode, flightRegion]);

    // --- VISUAL GENERATION ---
    useEffect(() => {
        if (visualizationMode === 'ROUTING' && (!startPoint || !endPoint)) {
            setVisualSegments([]);
            setRouteOptions([]);
        }
    }, [startPoint, endPoint, visualizationMode]);

    useEffect(() => {
        // Reset explore state when mode changes
        if (visualizationMode !== 'EXPLORE') {
            setNearbyPlaces([]);
            setExploreCategory("");
        }
    }, [visualizationMode]);

    useEffect(() => {
        if (visualizationMode !== 'ROUTING' || !currentPlan || !startPoint) return;

        const generateVisuals = async () => {
            const segments: VisualSegment[] = [];
            let currentStart = startPoint;

            for (const seg of currentPlan.segments) {
                const segEnd = seg.coordinates;
                
                if (seg.mode === 'FLIGHT') {
                    segments.push({
                        mode: 'AIR',
                        coordinates: [
                            [currentStart.lat, currentStart.lng],
                            [segEnd.lat, segEnd.lng]
                        ]
                    });
                } else {
                    const routeData = await fetchRoute(currentStart, segEnd);
                    if (routeData) {
                        segments.push({
                            mode: 'GROUND',
                            coordinates: routeData.coordinates
                        });
                    } else {
                        segments.push({
                            mode: 'GROUND',
                            coordinates: [
                                [currentStart.lat, currentStart.lng],
                                [segEnd.lat, segEnd.lng]
                            ]
                        });
                    }
                }
                currentStart = segEnd;
            }
            setVisualSegments(segments);
        };

        generateVisuals();
    }, [selectedOptionIndex, routeOptions, startPoint, visualizationMode]);

    const handleCalculateRoute = async () => {
        if (!startPoint || !endPoint) return;
        setCalculating(true);
        setRouteOptions([]);
        setVisualSegments([]);
        const plans = await planTripLogistics(startPoint, endPoint);
        if (plans.length > 0) {
            setRouteOptions(plans);
            setSelectedOptionIndex(0);
            const newItem: HistoryItem = {
                id: Date.now().toString(),
                start: startPoint,
                end: endPoint,
                startLabel: startLabel || "Unknown Start",
                endLabel: endLabel || "Unknown Dest",
                timestamp: Date.now(),
                routeOptions: plans,
                selectedOptionIndex: 0
            };
            setHistory(prev => {
                const filtered = prev.filter(h => !(h.start.lat === startPoint.lat && h.start.lng === startPoint.lng && h.end.lat === endPoint.lat && h.end.lng === endPoint.lng));
                return [newItem, ...filtered].slice(0, 10);
            });
        }
        setCalculating(false);
    };

    const handleExploreSearch = async (category: string) => {
        if (!startPoint) return;
        setSearchingPlaces(true);
        setExploreCategory(category);
        setNearbyPlaces([]); // Clear previous
        
        const places = await searchNearbyPlaces(startPoint, category);
        setNearbyPlaces(places);
        setSearchingPlaces(false);
    };

    const restoreHistoryItem = (item: HistoryItem) => {
        if (visualizationMode !== 'ROUTING') setVisualizationMode('ROUTING');
        setStartPoint(item.start);
        setStartLabel(item.startLabel);
        setEndPoint(item.end);
        setEndLabel(item.endLabel);
        if (item.routeOptions) setRouteOptions(item.routeOptions);
        else if ((item as any).tripPlan) setRouteOptions([(item as any).tripPlan]);
        setSelectedOptionIndex(item.selectedOptionIndex || 0);
    };

    const handleGeocode = async (query: string) => {
        const result = await geocodeLocation(query);
        if (result) {
            const { coords } = result;
            if (visualizationMode === 'EXPLORE') {
                setStartPoint(coords);
                setStartLabel(result.name);
                setEndPoint(null);
                setEndLabel("");
            } else if (visualizationMode === 'FLIGHT') {
                // Just center map
            } else {
                 if (!startPoint) { setStartPoint(coords); setStartLabel(result.name); } 
                 else if (!endPoint) { setEndPoint(coords); setEndLabel(result.name); } 
                 else { setStartPoint(coords); setStartLabel(result.name); setEndPoint(null); setEndLabel(""); setRouteOptions([]); setVisualSegments([]); }
            }
            return coords;
        }
        return null;
    };

    return {
        visualizationMode, setVisualizationMode,
        startPoint, setStartPoint,
        endPoint, setEndPoint,
        startLabel, setStartLabel,
        endLabel, setEndLabel,
        calculating,
        routeOptions, setRouteOptions,
        selectedOptionIndex, setSelectedOptionIndex,
        visualSegments,
        activeFlights,
        selectedFlightId, setSelectedFlightId, selectedFlight,
        flightRegion, setFlightRegion,
        history, setHistory, restoreHistoryItem,
        currentPlan,
        handleCalculateRoute,
        handleGeocode,
        // Explore Mode Props
        nearbyPlaces, searchingPlaces, exploreCategory, handleExploreSearch
    };
};
