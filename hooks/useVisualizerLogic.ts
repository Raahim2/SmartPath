import { useState, useEffect, useRef } from 'react';
import { Coordinates, TripPlan, HistoryItem, VisualizationMode, Flight, Place, FlightRegion, WeatherData } from '../types';
import { geocodeLocation, planTripLogistics, searchNearbyPlaces } from '../services/geminiService';
import { fetchRoute } from '../services/osmService';
import { fetchOpenSkyFlights, getAirlineFromCallsign, projectPosition } from '../utils/flightUtils';
import { fetchWeatherData, fetchRadarConfiguration } from '../services/weatherService';

export interface VisualSegment {
    coordinates: [number, number][];
    mode: 'GROUND' | 'AIR';
}

const LIVE_UPDATE_INTERVAL_MS = 20000; // Safe for OpenSky (20s)
const INTERPOLATION_INTERVAL_MS = 50; // Smooth movement update
const MAX_GLOBAL_FLIGHTS = 300; // Performance cap for global mode (Randomized sample)

export const useVisualizerLogic = (initialCenter?: Coordinates) => {
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

    // Weather Mode State
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
    const [loadingWeather, setLoadingWeather] = useState(false);

    // Data State
    const [routeOptions, setRouteOptions] = useState<TripPlan[]>([]);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
    const [visualSegments, setVisualSegments] = useState<VisualSegment[]>([]);

    // Flight Tracker State
    const [activeFlights, setActiveFlights] = useState<Flight[]>([]);
    const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
    const [flightRegion, setFlightRegion] = useState<FlightRegion>('GLOBAL');
    
    // Track stable IDs to prevent flickering
    const trackedFlightIdsRef = useRef<Set<string>>(new Set());

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

    // --- WEATHER LOGIC ---
    useEffect(() => {
        if (visualizationMode === 'WEATHER') {
            // Fetch Radar Config Once
            const getRadar = async () => {
                const ts = await fetchRadarConfiguration();
                setRadarTimestamp(ts);
            };
            getRadar();

            // Fetch Weather for current startPoint or initial
            if (startPoint) {
                handleFetchWeather(startPoint);
            } else if (initialCenter) {
                setStartPoint(initialCenter);
                setStartLabel("Region Center");
                handleFetchWeather(initialCenter);
            }
        }
    }, [visualizationMode]);

    const handleFetchWeather = async (coords: Coordinates) => {
        setLoadingWeather(true);
        const data = await fetchWeatherData(coords);
        setWeatherData(data);
        setLoadingWeather(false);
    };

    // --- FLIGHT LIVE DATA ENGINE ---
    useEffect(() => {
        if (visualizationMode === 'FLIGHT') {
            
            const fetchFlights = async () => {
                // If NEARBY is selected, use startPoint (User Loc) or initialCenter
                const centerToUse = startPoint || initialCenter;
                const rawStates = await fetchOpenSkyFlights(flightRegion, centerToUse);
                
                // Process Raw Data
                const allFlights = rawStates.map((state: any) => {
                    const lat = state[6];
                    const lng = state[5];

                    // Filter invalid coordinates
                    if (lat === null || lng === null) return null;

                    const icao24 = state[0];
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

                // --- STABLE TRACKING LOGIC ---
                // 1. Identify which tracked flights are still in the new data
                const currentTrackedIds = trackedFlightIdsRef.current;
                const newActiveList: Flight[] = [];
                
                // Get updated data for currently tracked flights
                allFlights.forEach(f => {
                    if (currentTrackedIds.has(f.id)) {
                        newActiveList.push(f);
                    }
                });

                // 2. If we need more flights to reach target (300 for global/region, or all for nearby)
                // For NEARBY, we usually want to show all available, but let's cap at 300 to be safe
                const targetCount = MAX_GLOBAL_FLIGHTS; 
                
                // If we have fewer than target (some landed or went out of range), replenish
                if (newActiveList.length < targetCount) {
                    const needed = targetCount - newActiveList.length;
                    
                    // Find candidates that are NOT currently tracked
                    const candidates = allFlights.filter(f => !currentTrackedIds.has(f.id));
                    
                    // Randomize candidates to ensure global distribution if mode is GLOBAL
                    // If NEARBY, randomization is fine too, but usually list is small
                    candidates.sort(() => Math.random() - 0.5);
                    
                    // Take what we need
                    const newAdditions = candidates.slice(0, needed);
                    newActiveList.push(...newAdditions);
                }

                // 3. If we have too many (e.g. switched from NEARBY to GLOBAL or region change), slice
                // But prefer keeping the ones we already track if possible. 
                // However, if we switched regions, the 'currentTrackedIds' might be invalid for the new region.
                // The `allFlights` array only contains valid flights for the CURRENT region/call.
                // So `newActiveList` only contains valid ones. We just need to cap it.
                // If we have > 300, slice it (but this usually won't happen due to logic above, unless newActiveList grew huge)
                const finalFlights = newActiveList.slice(0, targetCount);

                // 4. Update the ref with the new set of IDs
                trackedFlightIdsRef.current = new Set(finalFlights.map(f => f.id));
                
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
            trackedFlightIdsRef.current.clear(); // Reset tracking when leaving mode
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
        setVisualSegments([]);
        setEndPoint(null);
        
        const places = await searchNearbyPlaces(startPoint, category);
        setNearbyPlaces(places);
        setSearchingPlaces(false);
    };

    const handleNavigateToPlace = async (place: Place) => {
        if (!startPoint) return;
        setEndPoint(place.coordinates);
        setVisualSegments([]);
        const routeData = await fetchRoute(startPoint, place.coordinates);
        
        if (routeData) {
            setVisualSegments([{
                mode: 'GROUND',
                coordinates: routeData.coordinates
            }]);
        } else {
            setVisualSegments([{
                mode: 'GROUND',
                coordinates: [
                    [startPoint.lat, startPoint.lng],
                    [place.coordinates.lat, place.coordinates.lng]
                ]
            }]);
        }
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
                setNearbyPlaces([]);
                setVisualSegments([]);
            } else if (visualizationMode === 'WEATHER') {
                setStartPoint(coords);
                setStartLabel(result.name);
                handleFetchWeather(coords);
            } else if (visualizationMode === 'FLIGHT') {
                // Just center map
            } else {
                 // Routing Mode logic
                 if (!startPoint) { 
                     setStartPoint(coords); 
                     setStartLabel(result.name); 
                 } else if (!endPoint) { 
                     setEndPoint(coords); 
                     setEndLabel(result.name); 
                 } else { 
                     setStartPoint(coords); 
                     setStartLabel(result.name); 
                     setEndPoint(null); 
                     setEndLabel(""); 
                     setRouteOptions([]); 
                     setVisualSegments([]); 
                 }
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
        visualSegments, setVisualSegments,
        activeFlights,
        selectedFlightId, setSelectedFlightId, selectedFlight,
        flightRegion, setFlightRegion,
        history, setHistory, restoreHistoryItem,
        currentPlan,
        handleCalculateRoute,
        handleGeocode,
        // Explore Mode Props
        nearbyPlaces, setNearbyPlaces, searchingPlaces, exploreCategory, handleExploreSearch, handleNavigateToPlace,
        // Weather Mode Props
        weatherData, radarTimestamp, loadingWeather, handleFetchWeather
    };
};
