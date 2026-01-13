import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Coordinates, TripPlan, TripSegment } from '../types';
import { MapPin, Navigation, Loader2, Search, Crosshair, DollarSign, ShieldCheck, Plane, Train, Car, Bike, Footprints, Map as MapIcon, Play, History, RotateCcw, Clock, Trash2, Zap, Leaf } from 'lucide-react';
import { fetchRoute } from '../services/osmService';
import { geocodeLocation, planTripLogistics } from '../services/geminiService';

interface VisualizerProps {
  center: Coordinates;
}

type VisualSegment = {
    coordinates: [number, number][];
    mode: 'GROUND' | 'AIR';
};

interface HistoryItem {
    id: string;
    start: Coordinates;
    end: Coordinates;
    startLabel: string;
    endLabel: string;
    timestamp: number;
    routeOptions: TripPlan[]; // Changed from single tripPlan
    selectedOptionIndex: number; 
}

// --- ICONS ---
const createStartIcon = () => L.divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
      <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
      <div class="absolute w-8 h-8 bg-cyan-400/20 rounded-full animate-ping"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const createEndIcon = () => L.divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center group transform -translate-x-1/2 -translate-y-1/2">
       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-fuchsia-500 drop-shadow-[0_0_10px_rgba(217,70,239,0.9)]">
          <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" fill="rgba(217,70,239,0.3)"/>
          <circle cx="12" cy="10" r="3" fill="currentColor" />
       </svg>
       <div class="absolute -bottom-1 w-4 h-1 bg-fuchsia-500/50 blur-sm rounded-full"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const createCheckpointIcon = (index: number, mode: string) => {
    let colorClass = 'bg-amber-400';
    if (mode === 'FLIGHT') colorClass = 'bg-blue-400';
    if (mode === 'TRANSIT') colorClass = 'bg-green-400';

    return L.divIcon({
        className: 'bg-transparent',
        html: `
            <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
            <div class="w-3 h-3 ${colorClass} rotate-45 border border-white/50 drop-shadow-md"></div>
            <div class="absolute -top-6 text-[9px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-tighter whitespace-nowrap">
                NODE ${index + 1}
            </div>
            </div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
};

const ModeIcon = ({ mode, className = "", size = 14 }: { mode: string, className?: string, size?: number }) => {
    switch(mode) {
        case 'FLIGHT': return <Plane size={size} className={`${className} text-blue-400`} />;
        case 'TRANSIT': return <Train size={size} className={`${className} text-green-400`} />;
        case 'RICKSHAW': return <Bike size={size} className={`${className} text-amber-400`} />;
        case 'WALK': return <Footprints size={size} className={`${className} text-gray-400`} />;
        default: return <Car size={size} className={`${className} text-fuchsia-400`} />;
    }
};

export const Visualizer: React.FC<VisualizerProps> = ({ center }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const checkpointMarkersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const [startPoint, setStartPoint] = useState<Coordinates | null>(null);
  const [endPoint, setEndPoint] = useState<Coordinates | null>(null);
  const [startLabel, setStartLabel] = useState<string>("");
  const [endLabel, setEndLabel] = useState<string>("");
  const [calculating, setCalculating] = useState(false);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
        const saved = localStorage.getItem('neonpath_history');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  
  // Rich Data State
  const [routeOptions, setRouteOptions] = useState<TripPlan[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [visualSegments, setVisualSegments] = useState<VisualSegment[]>([]);

  // Derived current plan
  const currentPlan = routeOptions[selectedOptionIndex] || null;

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('neonpath_history', JSON.stringify(history));
  }, [history]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapInstance = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false, 
      dragging: true,
      scrollWheelZoom: true,
    }).setView([center.lat, center.lng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      maxZoom: 20,
      subdomains: 'abcd'
    }).addTo(mapInstance);

    // Initialize LayerGroup for route segments
    const layerGroup = L.layerGroup().addTo(mapInstance);
    routeLayerRef.current = layerGroup;

    mapInstance.on('click', (e) => {
        const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
        
        const hasStart = startMarkerRef.current !== null;
        const hasEnd = endMarkerRef.current !== null;
        const coordLabel = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

        if (!hasStart) {
            setStartPoint(coords);
            setStartLabel(`PIN: ${coordLabel}`);
        } else if (!hasEnd) {
            setEndPoint(coords);
            setEndLabel(`PIN: ${coordLabel}`);
        } else {
            // Reset and start new
            setStartPoint(coords);
            setStartLabel(`PIN: ${coordLabel}`);
            setEndPoint(null);
            setEndLabel("");
            setRouteOptions([]);
            setVisualSegments([]);
        }
    });

    mapRef.current = mapInstance;

    return () => {
      mapInstance.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Visuals when Selection Changes
  useEffect(() => {
    if (!currentPlan || !startPoint) return;
    
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
  }, [selectedOptionIndex, routeOptions, startPoint]);


  // Handle Route Calculation
  const handleCalculateRoute = async () => {
    if (!startPoint || !endPoint) return;

    setCalculating(true);
    setRouteOptions([]);
    setVisualSegments([]);

    // 1. Get Logical Plans (Gemini) - Now returns Array
    const plans = await planTripLogistics(startPoint, endPoint);
    
    if (plans.length > 0) {
        setRouteOptions(plans);
        setSelectedOptionIndex(0); // Default to first

        // 2. Save to History
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
            const filtered = prev.filter(h => 
                !(h.start.lat === startPoint.lat && h.start.lng === startPoint.lng &&
                h.end.lat === endPoint.lat && h.end.lng === endPoint.lng)
            );
            return [newItem, ...filtered].slice(0, 10);
        });
    }

    setCalculating(false);
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    setStartPoint(item.start);
    setStartLabel(item.startLabel);
    setEndPoint(item.end);
    setEndLabel(item.endLabel);
    
    // Restore logic & visuals immediately
    // Handle legacy history items that might be single object
    // @ts-ignore - legacy support
    if (item.tripPlan && !item.routeOptions) {
        // @ts-ignore
        setRouteOptions([item.tripPlan]);
    } else {
        setRouteOptions(item.routeOptions || []);
    }

    setSelectedOptionIndex(item.selectedOptionIndex || 0);
    
    setShowHistory(false);
    
    if (mapRef.current) {
        mapRef.current.flyTo([item.start.lat, item.start.lng], 10, { animate: true });
    }
  };

  const clearHistory = (e: React.MouseEvent) => {
      e.stopPropagation();
      setHistory([]);
  };

  // Reset visuals when points are cleared
  useEffect(() => {
    if (!startPoint || !endPoint) {
        setVisualSegments([]);
        setRouteOptions([]);
    }
  }, [startPoint, endPoint]);


  // Update Map Visuals (Markers & Polyline Layers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Start Marker
    if (startPoint) {
      if (startMarkerRef.current) {
        startMarkerRef.current.setLatLng([startPoint.lat, startPoint.lng]);
      } else {
        startMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], { icon: createStartIcon() }).addTo(map);
      }
    } else if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }

    // End Marker
    if (endPoint) {
      if (endMarkerRef.current) {
        endMarkerRef.current.setLatLng([endPoint.lat, endPoint.lng]);
      } else {
        endMarkerRef.current = L.marker([endPoint.lat, endPoint.lng], { icon: createEndIcon() }).addTo(map);
      }
    } else if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }

    // Checkpoint Markers (Based on Current Plan)
    checkpointMarkersRef.current.forEach(marker => marker.remove());
    checkpointMarkersRef.current = [];
    
    if (currentPlan && currentPlan.segments.length > 0) {
        currentPlan.segments.forEach((seg, index) => {
             const marker = L.marker(
                 [seg.coordinates.lat, seg.coordinates.lng], 
                 { icon: createCheckpointIcon(index, seg.mode) }
             ).addTo(map);
             checkpointMarkersRef.current.push(marker);
        });
    }

    // Route Polylines (Managed via LayerGroup)
    if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
        
        if (visualSegments.length > 0) {
            const allCoords: [number, number][] = [];

            visualSegments.forEach(seg => {
                allCoords.push(...seg.coordinates);

                L.polyline(seg.coordinates, {
                    color: seg.mode === 'AIR' ? '#60a5fa' : '#d946ef', 
                    weight: 4,
                    opacity: seg.mode === 'AIR' ? 0.6 : 0.8,
                    dashArray: seg.mode === 'AIR' ? '10, 10' : undefined,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(routeLayerRef.current!);
            });

            if (allCoords.length > 0 && calculating) {
                 // Only animate bounds on first calculate, not on every switch
                 const bounds = L.latLngBounds(allCoords);
                 map.fitBounds(bounds, { padding: [80, 80], animate: true });
            }
        }
    }

  }, [startPoint, endPoint, visualSegments, currentPlan, calculating]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    const result = await geocodeLocation(searchQuery);
    setIsSearching(false);

    if (result) {
        const { coords } = result;
        if (mapRef.current) {
            mapRef.current.flyTo([coords.lat, coords.lng], 15, { animate: true, duration: 1.5 });
        }
        
        if (!startPoint) {
            setStartPoint(coords);
            setStartLabel(result.name);
        } else if (!endPoint) {
            setEndPoint(coords);
            setEndLabel(result.name);
        } else {
            // Reset if both exist
            setStartPoint(coords);
            setStartLabel(result.name);
            setEndPoint(null);
            setEndLabel("");
            setRouteOptions([]);
            setVisualSegments([]);
        }
        setSearchQuery("");
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition((position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setStartPoint(coords);
        setStartLabel("CURRENT LOCATION");
        setEndPoint(null);
        setEndLabel("");
        if (mapRef.current) mapRef.current.flyTo([coords.lat, coords.lng], 16, { animate: true });
        setIsSearching(false);
    });
  };

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={mapContainerRef} className="absolute inset-0 z-0 cursor-crosshair grayscale-[0.2] contrast-[1.1]" />

      {/* LEFT PANEL: LOGISTICS HUD */}
      <div className="absolute top-8 left-8 z-20 flex flex-col gap-2 pointer-events-none max-h-[90vh]">
         {/* Title */}
         <div className="flex items-center gap-3">
             <div className="bg-black/90 backdrop-blur-md border-l-4 border-fuchsia-500 px-4 py-2 text-white shadow-lg skew-x-[-10deg]">
                <div className="skew-x-[10deg]">
                    <h2 className="text-2xl font-black italic tracking-widest uppercase text-white/90 drop-shadow-md">
                        NEON <span className="text-fuchsia-500">PATH</span>
                    </h2>
                </div>
             </div>
         </div>

         {/* Main Status Box */}
         <div className="bg-black/80 backdrop-blur-md p-4 w-80 border-t border-white/10 skew-x-[-10deg] shadow-xl pointer-events-auto">
            <div className="skew-x-[10deg] flex flex-col gap-3">
                {/* Points */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                        <span className="uppercase flex items-center gap-2"><MapPin size={14} className="text-cyan-400"/> START</span>
                        <div className="flex flex-col items-end">
                            <span className={startPoint ? "text-cyan-400" : "text-gray-600"}>{startPoint ? "LOCKED" : "---"}</span>
                            {startLabel && <span className="text-[9px] text-gray-500 uppercase max-w-[120px] truncate">{startLabel}</span>}
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                        <span className="uppercase flex items-center gap-2"><Navigation size={14} className="text-fuchsia-500"/> DEST</span>
                        <div className="flex flex-col items-end">
                            <span className={endPoint ? "text-fuchsia-500" : "text-gray-600"}>{endPoint ? "LOCKED" : "---"}</span>
                            {endLabel && <span className="text-[9px] text-gray-500 uppercase max-w-[120px] truncate">{endLabel}</span>}
                        </div>
                    </div>
                </div>
                
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-1"></div>
                
                {/* Calculate Button */}
                {routeOptions.length === 0 ? (
                    <div className="min-h-[2rem] flex items-center justify-center">
                        {startPoint && endPoint ? (
                            <button 
                                onClick={handleCalculateRoute}
                                disabled={calculating}
                                className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 px-4 rounded-sm transition-all flex items-center justify-center gap-2 border border-fuchsia-400/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:shadow-[0_0_20px_rgba(217,70,239,0.6)]"
                            >
                                {calculating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        PROCESSING...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} fill="currentColor" />
                                        INITIALIZE PATH
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="text-xs text-gray-500 font-mono text-center">
                                AWAITING COORDINATES...
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center text-xs text-fuchsia-400 font-bold uppercase tracking-widest animate-pulse">
                         SYSTEM OPTIMAL
                    </div>
                )}
            </div>
         </div>

         {/* ROUTE SELECTOR TABS */}
         {routeOptions.length > 0 && (
            <div className="flex gap-1 overflow-x-auto w-80 pointer-events-auto pb-1">
                {routeOptions.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedOptionIndex(idx)}
                        className={`flex-1 min-w-[80px] py-2 px-1 border-b-2 transition-all backdrop-blur-md text-[10px] font-bold uppercase tracking-wider skew-x-[-10deg] ${
                            selectedOptionIndex === idx 
                            ? 'bg-fuchsia-900/40 border-fuchsia-500 text-white shadow-[0_4px_10px_rgba(217,70,239,0.3)]' 
                            : 'bg-black/60 border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                    >
                        <div className="skew-x-[10deg] flex flex-col items-center gap-0.5">
                            <span className="truncate max-w-full">{opt.label}</span>
                            <span className={selectedOptionIndex === idx ? "text-amber-400" : ""}>{opt.totalDuration}</span>
                        </div>
                    </button>
                ))}
            </div>
         )}

         {/* SEGMENT DETAILS */}
         {currentPlan && (
             <div className="bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden w-80 flex flex-col pointer-events-auto rounded-sm">
                 {/* Header */}
                 <div className="bg-zinc-900/50 border-b border-white/10 p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest">
                        {currentPlan.label === 'FASTEST' && <Zap size={14} className="text-yellow-400" />}
                        {currentPlan.label === 'TRANSIT' && <Train size={14} className="text-cyan-400" />}
                        {currentPlan.label === 'ALTERNATIVE' && <Leaf size={14} className="text-green-400" />}
                        {currentPlan.label}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400 font-bold">
                        {currentPlan.totalCost}
                    </div>
                 </div>
                 
                 {/* Description */}
                 {currentPlan.description && (
                     <div className="px-4 py-2 text-[10px] text-gray-500 font-mono border-b border-white/5 truncate">
                        {currentPlan.description}
                     </div>
                 )}
                 
                 {/* Scroll Area */}
                 <div className="overflow-y-auto max-h-[40vh] p-4 custom-scrollbar">
                    <div className="relative border-l border-white/10 ml-2 pl-6 space-y-6">
                        {currentPlan.segments.map((seg, i) => (
                            <div key={i} className="relative group">
                                {/* Dot on timeline */}
                                <div className="absolute -left-[31px] top-0 bg-black border border-gray-600 group-hover:border-fuchsia-400 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                    <ModeIcon mode={seg.mode} size={12} />
                                </div>

                                {/* Card Body */}
                                <div className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-fuchsia-500/30 transition-all rounded-sm p-3 relative overflow-hidden group-hover:shadow-lg">
                                    
                                    {/* Top Row: Mode & Cost */}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-wider bg-cyan-900/10 px-1 rounded">
                                            {seg.mode}
                                        </span>
                                        <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-500/20 shadow-sm">
                                            {seg.cost}
                                        </span>
                                    </div>

                                    {/* Instruction */}
                                    <h4 className="text-sm font-bold text-gray-100 leading-tight mb-2">
                                        {seg.instruction}
                                    </h4>

                                    {/* Footer: Distance */}
                                    {seg.distance && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-1">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono uppercase">
                                                <MapIcon size={10} />
                                                <span>DIST: {seg.distance}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {/* End Node */}
                        <div className="relative">
                            <div className="absolute -left-[31px] top-0 bg-black border border-fuchsia-600 w-6 h-6 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                                <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-xs font-bold text-fuchsia-500 uppercase tracking-widest pt-1">
                                TARGET REACHED
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 {/* Footer of the box */}
                 <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-fuchsia-500 opacity-50"></div>
             </div>
         )}
      </div>

      {/* TOP RIGHT: CONTROLS */}
      <div className="absolute top-8 right-8 z-30 flex flex-col items-end gap-3">
        <form onSubmit={handleSearch} className="flex items-center">
            <div className={`bg-black/80 backdrop-blur-md border-r-4 ${isSearching ? 'border-fuchsia-500' : 'border-cyan-400'} px-4 py-2 text-white shadow-lg skew-x-[-10deg] flex items-center gap-2 group focus-within:border-white transition-colors`}>
                <div className="skew-x-[10deg] flex items-center gap-2">
                     {isSearching ? <Loader2 size={18} className="animate-spin text-fuchsia-400"/> : <Search size={18} className="text-cyan-400 group-focus-within:text-white transition-colors"/>}
                     <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ENTER TARGET..." 
                        className="bg-transparent border-none outline-none text-sm font-bold tracking-wider w-48 placeholder-gray-600 uppercase text-white"
                        disabled={isSearching}
                     />
                </div>
            </div>
        </form>

        <button 
            onClick={handleLocateMe}
            disabled={isSearching}
            className="bg-black/80 backdrop-blur-md border-r-4 border-cyan-400 px-4 py-2 text-white shadow-lg skew-x-[-10deg] hover:bg-white/10 transition-colors flex items-center gap-2 group"
        >
            <div className="skew-x-[10deg] flex items-center gap-2">
                <Crosshair size={18} className="text-cyan-400 group-hover:animate-spin-slow" />
                <span className="text-xs font-bold tracking-wider">LOCATE ME</span>
            </div>
        </button>

        {/* History Toggle Button */}
        <div className="relative">
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`bg-black/80 backdrop-blur-md border-r-4 ${showHistory ? 'border-amber-400 bg-white/10' : 'border-gray-500'} px-4 py-2 text-white shadow-lg skew-x-[-10deg] hover:bg-white/10 transition-colors flex items-center gap-2 group`}
            >
                <div className="skew-x-[10deg] flex items-center gap-2">
                    <History size={18} className={`${showHistory ? 'text-amber-400' : 'text-gray-400'} group-hover:text-amber-300`} />
                    <span className="text-xs font-bold tracking-wider">HISTORY</span>
                </div>
            </button>

            {/* History Dropdown Panel */}
            {showHistory && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl skew-x-[-5deg] origin-top-right z-40 max-h-[60vh] overflow-y-auto custom-scrollbar">
                     <div className="skew-x-[5deg]">
                         <div className="p-3 border-b border-white/10 flex justify-between items-center bg-zinc-900/50 sticky top-0 z-10">
                            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Recent Ops
                            </span>
                            {history.length > 0 && (
                                <button onClick={clearHistory} className="text-gray-500 hover:text-red-400 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            )}
                         </div>
                         
                         <div className="p-2 space-y-1">
                             {history.length === 0 ? (
                                 <div className="text-center py-4 text-gray-600 text-[10px] font-mono uppercase">
                                     No Mission Data
                                 </div>
                             ) : (
                                 history.map(item => (
                                     <button 
                                        key={item.id}
                                        onClick={() => restoreHistoryItem(item)}
                                        className="w-full text-left p-2 hover:bg-white/5 border border-transparent hover:border-amber-500/30 rounded-sm group transition-all"
                                     >
                                         <div className="flex items-center justify-between mb-1">
                                             <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 group-hover:text-white">
                                                 <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                                                 <span className="truncate max-w-[80px]">{item.startLabel}</span>
                                             </div>
                                             <div className="h-px bg-gray-700 flex-1 mx-2"></div>
                                             <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 group-hover:text-white">
                                                 <span className="truncate max-w-[80px] text-right">{item.endLabel}</span>
                                                 <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></span>
                                             </div>
                                         </div>
                                         <div className="flex justify-between items-center mt-1">
                                             <span className="text-[9px] text-gray-600 font-mono">
                                                 ID: {item.id.slice(-4)}
                                             </span>
                                             <span className="text-[9px] text-amber-500/70 font-mono group-hover:text-amber-400 flex items-center gap-1">
                                                 <RotateCcw size={8} /> RELOAD
                                             </span>
                                         </div>
                                     </button>
                                 ))
                             )}
                         </div>
                     </div>
                </div>
            )}
        </div>
      </div>

      {/* FOOTER HINT */}
      <div className="absolute bottom-10 right-10 z-20 pointer-events-none opacity-70">
         <div className="flex flex-col items-end gap-1 text-white font-bold uppercase tracking-wider text-[10px]">
             <div className="flex items-center gap-2">
                 <span className="bg-white text-black px-1.5 rounded-sm">LMB</span>
                 <span>SET WAYPOINT</span>
             </div>
         </div>
      </div>
    </div>
  );
};