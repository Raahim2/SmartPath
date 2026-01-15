import React from 'react';
import { Coordinates, TripPlan } from '../types';
import { MapPin, Navigation, Play, Loader2, Zap, Train, Leaf, Map as MapIcon, Plane, Car, Bike, Footprints } from 'lucide-react';

interface LogisticsPanelProps {
    startPoint: Coordinates | null;
    endPoint: Coordinates | null;
    startLabel: string;
    endLabel: string;
    calculating: boolean;
    routeOptions: TripPlan[];
    selectedOptionIndex: number;
    currentPlan: TripPlan | null;
    onCalculate: () => void;
    onSelectOption: (index: number) => void;
}

const ModeIcon = ({ mode, className = "", size = 14 }: { mode: string, className?: string, size?: number }) => {
    switch(mode) {
        case 'FLIGHT': return <Plane size={size} className={`${className} text-blue-500`} />;
        case 'TRANSIT': return <Train size={size} className={`${className} text-green-500`} />;
        case 'RICKSHAW': return <Bike size={size} className={`${className} text-amber-500`} />;
        case 'WALK': return <Footprints size={size} className={`${className} text-gray-500`} />;
        default: return <Car size={size} className={`${className} text-fuchsia-500`} />;
    }
};

export const LogisticsPanel: React.FC<LogisticsPanelProps> = ({
    startPoint, endPoint, startLabel, endLabel, calculating,
    routeOptions, selectedOptionIndex, currentPlan, onCalculate, onSelectOption
}) => {
    
    // Always Dark Mode styles
    const styles = {
        panelBg: 'bg-black/80',
        textPrimary: 'text-white',
        textSecondary: 'text-gray-400',
        border: 'border-white/10',
        shadow: 'shadow-xl'
    };

    return (
        <div className={`absolute z-20 flex flex-col gap-2 pointer-events-none 
          md:top-28 md:left-8 md:bottom-auto md:right-auto md:w-auto md:items-start
          bottom-2 left-2 right-2 items-center
          transition-all duration-300
          ${currentPlan ? 'max-h-[50vh] md:max-h-[85vh]' : 'h-auto'}
        `}>
             {/* Main Status Box */}
         <div className={`${styles.panelBg} backdrop-blur-md p-3 md:p-4 w-full md:w-80 border-t ${styles.border} skew-x-[-2deg] md:skew-x-[-10deg] ${styles.shadow} pointer-events-auto transition-all duration-300`}>
            <div className="skew-x-[2deg] md:skew-x-[10deg] flex flex-col gap-2 md:gap-3">
                {/* Points */}
                <div className="space-y-1">
                    <div className={`flex justify-between items-center text-sm font-bold ${styles.textSecondary}`}>
                        <span className="uppercase flex items-center gap-2"><MapPin size={14} className="text-cyan-500"/> START</span>
                        <div className="flex flex-col items-end">
                            <span className={startPoint ? "text-cyan-500" : styles.textSecondary}>{startPoint ? "LOCKED" : "---"}</span>
                            {startLabel && <span className={`text-[9px] uppercase max-w-[120px] truncate opacity-70`}>{startLabel}</span>}
                        </div>
                    </div>
                    <div className={`flex justify-between items-center text-sm font-bold ${styles.textSecondary}`}>
                        <span className="uppercase flex items-center gap-2"><Navigation size={14} className="text-fuchsia-500"/> DEST</span>
                        <div className="flex flex-col items-end">
                            <span className={endPoint ? "text-fuchsia-500" : styles.textSecondary}>{endPoint ? "LOCKED" : "---"}</span>
                            {endLabel && <span className={`text-[9px] uppercase max-w-[120px] truncate opacity-70`}>{endLabel}</span>}
                        </div>
                    </div>
                </div>
                
                <div className={`h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-1`}></div>
                
                {/* Calculate Button or Stats */}
                {routeOptions.length === 0 ? (
                    <div className="min-h-[2rem] flex items-center justify-center">
                        {startPoint && endPoint ? (
                            <button 
                                onClick={onCalculate}
                                disabled={calculating}
                                className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 px-4 rounded-sm transition-all flex items-center justify-center gap-2 border border-fuchsia-400/50 shadow-md hover:shadow-lg"
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
                            <div className={`text-xs ${styles.textSecondary} font-mono text-center`}>
                                AWAITING COORDINATES...
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-xs text-fuchsia-500 font-bold uppercase tracking-widest animate-pulse">
                             SYSTEM OPTIMAL
                         </div>
                         {/* Total Cost with Currency */}
                         {currentPlan && (
                             <div className="text-sm font-mono font-bold text-amber-500">
                                {currentPlan.currency} {currentPlan.totalCost}
                             </div>
                         )}
                    </div>
                )}
            </div>
         </div>

         {/* ROUTE SELECTOR TABS */}
         {routeOptions.length > 0 && (
            <div className="flex gap-1 overflow-x-auto w-full md:w-80 pointer-events-auto pb-1 hide-scrollbar">
                {routeOptions.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectOption(idx)}
                        className={`flex-1 min-w-[80px] py-2 px-1 border-b-2 transition-all backdrop-blur-md text-[10px] font-bold uppercase tracking-wider skew-x-[-10deg] ${
                            selectedOptionIndex === idx 
                            ? 'bg-fuchsia-900/80 border-fuchsia-500 text-white shadow-md' 
                            : 'bg-black/60 text-gray-500 hover:bg-white/5 border-transparent'
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
             <div className={`${styles.panelBg} backdrop-blur-xl border ${styles.border} ${styles.shadow} w-full md:w-80 flex flex-col pointer-events-auto rounded-sm flex-shrink overflow-hidden min-h-0 transition-all duration-300`}>
                 {/* Header */}
                 <div className={`bg-zinc-900/50 border-b ${styles.border} p-3 flex justify-between items-center flex-shrink-0`}>
                    <div className={`flex items-center gap-2 text-xs font-black ${styles.textPrimary} uppercase tracking-widest`}>
                        {currentPlan.label === 'FASTEST' && <Zap size={14} className="text-amber-500" />}
                        {currentPlan.label === 'TRANSIT' && <Train size={14} className="text-cyan-500" />}
                        {currentPlan.label === 'ALTERNATIVE' && <Leaf size={14} className="text-green-500" />}
                        {currentPlan.label}
                    </div>
                    {/* Cost with Currency */}
                    <div className="text-[10px] font-mono text-amber-500 font-bold">
                        {currentPlan.currency} {currentPlan.totalCost}
                    </div>
                 </div>
                 
                 {/* Description */}
                 {currentPlan.description && (
                     <div className={`px-4 py-2 text-[10px] ${styles.textSecondary} font-mono border-b ${styles.border} truncate flex-shrink-0`}>
                        {currentPlan.description}
                     </div>
                 )}
                 
                 {/* Scroll Area */}
                 <div className="overflow-y-auto min-h-0 custom-scrollbar p-4">
                    <div className={`relative border-l ${styles.border} ml-2 pl-6 space-y-6`}>
                        {currentPlan.segments.map((seg, i) => (
                            <div key={i} className="relative group">
                                {/* Dot on timeline */}
                                <div className={`absolute -left-[31px] top-0 bg-black border-gray-600 border group-hover:border-fuchsia-400 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 shadow-sm`}>
                                    <ModeIcon mode={seg.mode} size={12} />
                                </div>

                                {/* Card Body */}
                                <div className={`bg-white/5 hover:bg-white/10 border border-white/5 hover:border-fuchsia-500/30 transition-all rounded-sm p-3 relative overflow-hidden group-hover:shadow-md`}>
                                    
                                    {/* Top Row: Mode & Cost */}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-mono text-cyan-600 uppercase tracking-wider bg-cyan-500/10 px-1 rounded">
                                            {seg.mode}
                                        </span>
                                        <span className="text-xs font-bold text-amber-500 font-mono flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shadow-sm">
                                            {seg.cost}
                                        </span>
                                    </div>

                                    {/* Instruction */}
                                    <h4 className={`text-sm font-bold ${styles.textPrimary} leading-tight mb-2`}>
                                        {seg.instruction}
                                    </h4>

                                    {/* Footer: Distance */}
                                    {seg.distance && (
                                        <div className={`flex items-center gap-2 pt-2 border-t ${styles.border} mt-1`}>
                                            <div className={`flex items-center gap-1 text-[10px] ${styles.textSecondary} font-mono uppercase`}>
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
                            <div className={`absolute -left-[31px] top-0 bg-black border border-fuchsia-600 w-6 h-6 rounded-full flex items-center justify-center shadow-md`}>
                                <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-xs font-bold text-fuchsia-500 uppercase tracking-widest pt-1">
                                TARGET REACHED
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 {/* Footer of the box */}
                 <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-fuchsia-500 opacity-50 flex-shrink-0"></div>
             </div>
         )}
        </div>
    );
};
