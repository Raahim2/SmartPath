import React, { useState } from 'react';
import { Search, Loader2, Crosshair, History, Clock, Trash2, RotateCcw, Map as MapIcon, Grid, Globe, ChevronDown } from 'lucide-react';
import { VisualizationMode, HistoryItem, FlightRegion } from '../types';

interface ControlBarProps {
    mode: VisualizationMode;
    isSearching: boolean;
    searchQuery: string;
    setSearchQuery: (s: string) => void;
    onSearch: (e: React.FormEvent) => void;
    onLocateMe: () => void;
    history: HistoryItem[];
    onClearHistory: (e: React.MouseEvent) => void;
    onRestoreHistory: (item: HistoryItem) => void;
    onOpenMapSelector: () => void;
    flightRegion?: FlightRegion;
    onSetFlightRegion?: (r: FlightRegion) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
    mode, isSearching, searchQuery, setSearchQuery, onSearch, onLocateMe,
    history, onClearHistory, onRestoreHistory, onOpenMapSelector,
    flightRegion, onSetFlightRegion
}) => {
    const [showHistory, setShowHistory] = useState(false);
    const [showRegionMenu, setShowRegionMenu] = useState(false);

    // Styles
    const styles = {
        panelBg: 'bg-black/80',
        textPrimary: 'text-white',
        textSecondary: 'text-gray-400',
        border: 'border-white/10',
        inputPlaceholder: 'placeholder-gray-600',
        shadow: 'shadow-xl'
    };

    const regions: { id: FlightRegion, label: string }[] = [
        { id: 'NEARBY', label: 'Nearby (My Area)' },
        { id: 'GLOBAL', label: 'Global Network' },
        { id: 'NA', label: 'North America' },
        { id: 'EU', label: 'Europe' },
        { id: 'AS', label: 'Asia' },
        { id: 'SA', label: 'South America' },
        { id: 'AF', label: 'Africa' },
        { id: 'OC', label: 'Oceania' },
    ];

    const showSearch = mode === 'ROUTING' || mode === 'EXPLORE';

    return (
        <div className="absolute top-4 right-4 md:top-8 md:right-8 z-30 flex flex-col items-end gap-2 md:gap-3 pointer-events-none">
            
            <div className="flex gap-2">
                {/* FLIGHT REGION SELECTOR (Only in FLIGHT mode) */}
                {mode === 'FLIGHT' && onSetFlightRegion && (
                    <div className="relative pointer-events-auto">
                        <button
                            onClick={() => setShowRegionMenu(!showRegionMenu)}
                            className={`${styles.panelBg} backdrop-blur-md border border-blue-500/50 px-3 py-1.5 md:px-4 md:py-2 text-blue-400 ${styles.shadow} skew-x-[-10deg] hover:bg-blue-500/10 transition-colors flex items-center gap-2 group`}
                        >
                            <div className="skew-x-[10deg] flex items-center gap-2">
                                <Globe size={16} />
                                <span className="text-[10px] font-bold tracking-wider uppercase">
                                    {regions.find(r => r.id === flightRegion)?.label || 'Region'}
                                </span>
                                <ChevronDown size={12} />
                            </div>
                        </button>
                        
                        {showRegionMenu && (
                            <div className={`absolute top-full right-0 mt-2 w-40 ${styles.panelBg} backdrop-blur-xl border border-blue-500/30 ${styles.shadow} skew-x-[-5deg] z-40`}>
                                <div className="skew-x-[5deg] py-1">
                                    {regions.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => {
                                                onSetFlightRegion(r.id);
                                                setShowRegionMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-blue-500/20 ${flightRegion === r.id ? 'text-white bg-blue-500/10' : 'text-gray-400'}`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MAP SELECTOR TRIGGER */}
                <button
                    onClick={onOpenMapSelector}
                    className={`pointer-events-auto ${styles.panelBg} backdrop-blur-md border border-white/20 px-3 py-1.5 md:px-4 md:py-2 ${styles.textPrimary} ${styles.shadow} skew-x-[-10deg] hover:bg-white/10 transition-colors flex items-center gap-2 group`}
                >
                    <div className="skew-x-[10deg] flex items-center gap-2">
                        <Grid size={16} className="text-fuchsia-500 group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-bold tracking-wider">GRID / MODE</span>
                    </div>
                </button>
            </div>

            {/* SEARCH (Conditional) */}
            {showSearch && (
                <form onSubmit={onSearch} className="flex items-center pointer-events-auto">
                    <div className={`${styles.panelBg} backdrop-blur-md border-r-4 ${isSearching ? 'border-fuchsia-500' : (mode === 'EXPLORE' ? 'border-emerald-500' : 'border-cyan-400')} px-3 py-1.5 md:px-4 md:py-2 ${styles.textPrimary} ${styles.shadow} skew-x-[-10deg] flex items-center gap-2 group focus-within:border-gray-400 transition-colors`}>
                        <div className="skew-x-[10deg] flex items-center gap-2">
                            {isSearching ? <Loader2 size={16} className="animate-spin text-fuchsia-400"/> : <Search size={16} className={`${mode === 'EXPLORE' ? 'text-emerald-500' : 'text-cyan-400'} group-focus-within:text-gray-500 transition-colors`}/>}
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={mode === 'EXPLORE' ? "SET SEARCH CENTER..." : "ENTER TARGET..."}
                                className={`bg-transparent border-none outline-none text-xs md:text-sm font-bold tracking-wider w-32 md:w-48 ${styles.inputPlaceholder} uppercase ${styles.textPrimary}`}
                                disabled={isSearching}
                            />
                        </div>
                    </div>
                </form>
            )}

            {/* LOCATE ME (Always Visible) */}
            <button 
                onClick={onLocateMe}
                disabled={isSearching}
                className={`pointer-events-auto ${styles.panelBg} backdrop-blur-md border-r-4 border-cyan-400 px-3 py-1.5 md:px-4 md:py-2 ${styles.textPrimary} ${styles.shadow} skew-x-[-10deg] hover:bg-opacity-80 transition-colors flex items-center gap-2 group`}
            >
                <div className="skew-x-[10deg] flex items-center gap-2">
                    <Crosshair size={16} className="text-cyan-400 group-hover:animate-spin-slow" />
                    <span className="text-[10px] md:text-xs font-bold tracking-wider">LOCATE ME</span>
                </div>
            </button>

            {/* HISTORY */}
            <div className="relative pointer-events-auto">
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`${styles.panelBg} backdrop-blur-md border-r-4 ${showHistory ? 'border-amber-400 bg-opacity-100' : 'border-gray-500'} px-3 py-1.5 md:px-4 md:py-2 ${styles.textPrimary} ${styles.shadow} skew-x-[-10deg] hover:bg-opacity-80 transition-colors flex items-center gap-2 group`}
                >
                    <div className="skew-x-[10deg] flex items-center gap-2">
                        <History size={16} className={`${showHistory ? 'text-amber-400' : 'text-gray-400'} group-hover:text-amber-500`} />
                        <span className="text-[10px] md:text-xs font-bold tracking-wider">HISTORY</span>
                    </div>
                </button>

                {/* History Dropdown */}
                {showHistory && (
                    <div className={`absolute top-full right-0 mt-2 w-64 md:w-72 ${styles.panelBg} backdrop-blur-xl border ${styles.border} ${styles.shadow} skew-x-[-5deg] origin-top-right z-40 max-h-[60vh] overflow-y-auto custom-scrollbar`}>
                        <div className="skew-x-[5deg]">
                            <div className={`p-3 border-b ${styles.border} flex justify-between items-center sticky top-0 z-10 bg-zinc-900/90`}>
                                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12} /> Recent Ops
                                </span>
                                {history.length > 0 && (
                                    <button onClick={onClearHistory} className="text-gray-500 hover:text-red-500 transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                            
                            <div className="p-2 space-y-1">
                                {history.length === 0 ? (
                                    <div className={`text-center py-4 ${styles.textSecondary} text-[10px] font-mono uppercase`}>
                                        No Mission Data
                                    </div>
                                ) : (
                                    history.map(item => (
                                        <button 
                                            key={item.id}
                                            onClick={() => {
                                                onRestoreHistory(item);
                                                setShowHistory(false);
                                            }}
                                            className={`w-full text-left p-2 hover:bg-opacity-10 border border-transparent hover:border-amber-500/30 rounded-sm group transition-all hover:bg-white`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className={`flex items-center gap-1.5 text-xs font-bold ${styles.textSecondary} group-hover:${styles.textPrimary}`}>
                                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                                                    <span className="truncate max-w-[80px]">{item.startLabel}</span>
                                                </div>
                                                <div className={`h-px bg-gray-700 flex-1 mx-2`}></div>
                                                <div className={`flex items-center gap-1.5 text-xs font-bold ${styles.textSecondary} group-hover:${styles.textPrimary}`}>
                                                    <span className="truncate max-w-[80px] text-right">{item.endLabel}</span>
                                                    <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className={`text-[9px] ${styles.textSecondary} font-mono`}>
                                                    ID: {item.id.slice(-4)}
                                                </span>
                                                <span className="text-[9px] text-amber-500/70 font-mono group-hover:text-amber-500 flex items-center gap-1">
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
    );
};
