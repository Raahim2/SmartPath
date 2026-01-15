import React from 'react';
import { Flight } from '../types';
import { X, Plane, Navigation, Gauge, Globe, Satellite } from 'lucide-react';

interface FlightPanelProps {
    flight: Flight | null;
    onClose: () => void;
}

export const FlightPanel: React.FC<FlightPanelProps> = ({ flight, onClose }) => {
    if (!flight) return null;

    const logoUrl = flight.airline.website 
        ? `https://logo.clearbit.com/${flight.airline.website}`
        : '';

    return (
        <div className="absolute top-20 right-4 md:right-8 z-20 w-80 pointer-events-auto">
             {/* Main Card */}
             <div className="bg-black/90 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.2)] rounded-sm overflow-hidden flex flex-col skew-x-[-2deg]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900/40 to-black p-4 border-b border-blue-500/20 flex justify-between items-start skew-x-[2deg]">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-sm flex items-center justify-center p-1 shadow-inner overflow-hidden">
                             {logoUrl ? (
                                 <img 
                                    src={logoUrl} 
                                    alt={flight.airline.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerText = flight.airlineCode || "UNK";
                                        (e.target as HTMLImageElement).parentElement!.className = "w-10 h-10 bg-blue-800 text-white font-bold flex items-center justify-center text-xs";
                                    }}
                                 />
                             ) : (
                                 <div className="w-10 h-10 bg-blue-800 text-white font-bold flex items-center justify-center text-xs">
                                     {flight.airlineCode || "UNK"}
                                 </div>
                             )}
                         </div>
                         <div>
                             <h2 className="text-xl font-black text-white tracking-wider font-mono">{flight.flightNumber || "N/A"}</h2>
                             <div className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">{flight.airline.name}</div>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-blue-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Info Body */}
                <div className="p-4 space-y-4 skew-x-[2deg]">
                    
                    {/* Origin Country (Since we don't have Route) */}
                    <div className="bg-white/5 border border-white/10 p-3 rounded-sm flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-full">
                            <Globe size={16} className="text-blue-400" />
                        </div>
                        <div>
                            <div className="text-[9px] text-gray-400 uppercase tracking-widest">Origin Country</div>
                            <div className="text-sm font-bold text-white">{flight.originCountry}</div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-white/5 border border-white/10 p-2 rounded-sm">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                                <Gauge size={12} className="text-amber-400" /> Velocity
                            </div>
                            <div className="text-lg font-bold font-mono text-white">{Math.round(flight.speed)} <span className="text-xs text-gray-500">km/h</span></div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-2 rounded-sm">
                             <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                                <Navigation size={12} className="text-cyan-400" /> Altitude
                            </div>
                            <div className="text-lg font-bold font-mono text-white">{Math.round(flight.altitude).toLocaleString()} <span className="text-xs text-gray-500">ft</span></div>
                        </div>
                         <div className="bg-white/5 border border-white/10 p-2 rounded-sm col-span-2">
                             <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                                <Satellite size={12} className="text-fuchsia-400" /> Transponder
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold font-mono text-white">{flight.id.toUpperCase()}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${flight.onGround ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                                    {flight.onGround ? 'ON GROUND' : 'AIRBORNE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Live Indicator */}
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></div>
                            <span className="text-[10px] text-red-400 font-bold tracking-widest uppercase">Live OpenSky Data</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                            {flight.currentPos.lat.toFixed(3)}, {flight.currentPos.lng.toFixed(3)}
                        </div>
                    </div>

                </div>
             </div>
        </div>
    );
};
