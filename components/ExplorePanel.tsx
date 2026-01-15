import React, { useState } from 'react';
import { Coordinates, Place } from '../types';
import { MapPin, Search, Loader2, Navigation, GraduationCap, Utensils, Stethoscope, ShoppingBag, Trees, Building2, Ticket } from 'lucide-react';

interface ExplorePanelProps {
    startPoint: Coordinates | null;
    startLabel: string;
    nearbyPlaces: Place[];
    searchingPlaces: boolean;
    onSearchCategory: (category: string) => void;
}

const CATEGORIES = [
    { id: 'Schools', label: 'School', icon: <GraduationCap size={16} /> },
    { id: 'Hospitals', label: 'Hospital', icon: <Stethoscope size={16} /> },
    { id: 'Restaurants', label: 'Food', icon: <Utensils size={16} /> },
    { id: 'Theaters', label: 'Theater', icon: <Ticket size={16} /> },
    { id: 'Parks', label: 'Park', icon: <Trees size={16} /> },
    { id: 'Malls', label: 'Mall', icon: <ShoppingBag size={16} /> },
    { id: 'Hotels', label: 'Hotel', icon: <Building2 size={16} /> },
];

export const ExplorePanel: React.FC<ExplorePanelProps> = ({ 
    startPoint, startLabel, nearbyPlaces, searchingPlaces, onSearchCategory 
}) => {
    const [customQuery, setCustomQuery] = useState("");

    // Styles
    const styles = {
        panelBg: 'bg-black/80',
        textPrimary: 'text-white',
        textSecondary: 'text-gray-400',
        border: 'border-white/10',
        shadow: 'shadow-xl'
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(customQuery.trim()) {
            onSearchCategory(customQuery);
        }
    };

    return (
        <div className={`absolute z-20 flex flex-col gap-2 pointer-events-none 
          md:top-28 md:left-8 md:bottom-auto md:right-auto md:w-80
          bottom-2 left-2 right-2
          max-h-[60vh] md:max-h-[85vh]
        `}>
             {/* Search Center Status */}
             <div className={`${styles.panelBg} backdrop-blur-md p-3 md:p-4 w-full border-t ${styles.border} skew-x-[-2deg] md:skew-x-[-5deg] ${styles.shadow} pointer-events-auto transition-all duration-300`}>
                <div className="skew-x-[2deg] md:skew-x-[5deg]">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                            <Navigation size={12} /> Search Center
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className={`text-sm font-bold ${styles.textPrimary} truncate`}>
                            {startLabel || "Select a location on map"}
                        </span>
                    </div>
                    
                    {!startPoint ? (
                        <div className="text-[10px] text-gray-500 font-mono text-center border border-dashed border-gray-700 p-2 rounded">
                            CLICK MAP OR SEARCH TO SET CENTER
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => onSearchCategory(cat.id)}
                                        disabled={searchingPlaces}
                                        className="bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 rounded-sm p-2 flex flex-col items-center gap-1 transition-all group"
                                    >
                                        <div className="text-gray-400 group-hover:text-emerald-400">{cat.icon}</div>
                                        <span className="text-[9px] font-bold text-gray-500 group-hover:text-white uppercase">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <form onSubmit={handleCustomSubmit} className="flex gap-2 mt-2">
                                <input 
                                    type="text" 
                                    value={customQuery}
                                    onChange={(e) => setCustomQuery(e.target.value)}
                                    placeholder="Find custom..."
                                    className="bg-black/50 border border-white/10 rounded-sm px-2 py-1 text-xs text-white w-full outline-none focus:border-emerald-500"
                                />
                                <button type="submit" disabled={searchingPlaces} className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded-sm">
                                    <Search size={14} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
             </div>

             {/* Results List */}
             {searchingPlaces && (
                 <div className={`${styles.panelBg} backdrop-blur-md p-4 w-full border ${styles.border} flex justify-center items-center text-emerald-500 gap-2`}>
                     <Loader2 size={16} className="animate-spin" />
                     <span className="text-xs font-bold uppercase">Scanning Area...</span>
                 </div>
             )}

             {!searchingPlaces && nearbyPlaces.length > 0 && (
                 <div className={`${styles.panelBg} backdrop-blur-xl border ${styles.border} ${styles.shadow} w-full flex flex-col pointer-events-auto rounded-sm overflow-hidden min-h-0`}>
                     <div className="bg-emerald-900/30 p-2 border-b border-white/10 flex justify-between items-center">
                         <span className="text-xs font-bold text-white uppercase tracking-wider">Results Found</span>
                         <span className="text-[10px] font-mono text-emerald-400">{nearbyPlaces.length} LOCATIONS</span>
                     </div>
                     <div className="overflow-y-auto custom-scrollbar p-2 space-y-2">
                         {nearbyPlaces.map((place) => (
                             <div key={place.id} className="bg-white/5 border border-white/5 p-2 rounded-sm hover:border-emerald-500/30 transition-colors">
                                 <div className="flex justify-between items-start">
                                     <h4 className="text-sm font-bold text-white">{place.name}</h4>
                                     <span className="text-[10px] font-mono text-yellow-500">{place.rating}</span>
                                 </div>
                                 <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{place.description}</p>
                                 <div className="flex items-center gap-1 mt-2">
                                     <MapPin size={10} className="text-gray-500" />
                                     <span className="text-[9px] font-mono text-gray-500">
                                         {place.coordinates.lat.toFixed(4)}, {place.coordinates.lng.toFixed(4)}
                                     </span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
        </div>
    );
};
