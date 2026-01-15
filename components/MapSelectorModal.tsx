import React from 'react';
import { Map, Globe, Leaf, Train, X, Compass } from 'lucide-react';
import { VisualizationMode } from '../types';

interface MapSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMode: VisualizationMode;
    onSelectMode: (mode: VisualizationMode) => void;
}

export const MapSelectorModal: React.FC<MapSelectorModalProps> = ({ isOpen, onClose, currentMode, onSelectMode }) => {
    if (!isOpen) return null;

    const options: { id: VisualizationMode; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
        { 
            id: 'ROUTING', 
            label: 'SMART ROUTING', 
            icon: <Map size={32} />, 
            desc: 'AI-driven pathfinding optimized for urban environments. Includes traffic and transit integration.',
            color: 'text-fuchsia-500 border-fuchsia-500'
        },
        { 
            id: 'FLIGHT', 
            label: 'GLOBAL AIRSPACE', 
            icon: <Globe size={32} />, 
            desc: 'Real-time global flight tracking and great-circle route visualization.',
            color: 'text-blue-500 border-blue-500'
        },
        { 
            id: 'EXPLORE', 
            label: 'LOCAL EXPLORER', 
            icon: <Compass size={32} />, 
            desc: 'Find schools, hospitals, theaters, and other points of interest near any location.',
            color: 'text-emerald-500 border-emerald-500'
        },
        { 
            id: 'TRANSIT', 
            label: 'METRO GRID', 
            icon: <Train size={32} />, 
            desc: 'Subway and light rail network overlays. (Unavailable)',
            color: 'text-cyan-500 border-cyan-500'
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-black/90 border border-white/10 shadow-2xl p-6 md:p-8 skew-x-0">
                
                {/* Decoration */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/30"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/30"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/30"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/30"></div>

                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-black italic tracking-widest text-white uppercase flex items-center gap-2">
                        SELECT <span className="text-fuchsia-500">VISUALIZATION PROTOCOL</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {options.map((opt) => {
                        const isSelected = currentMode === opt.id;
                        const disabled = opt.id === 'TRANSIT';
                        
                        return (
                            <button
                                key={opt.id}
                                disabled={disabled}
                                onClick={() => {
                                    onSelectMode(opt.id);
                                    onClose();
                                }}
                                className={`
                                    relative p-6 text-left border transition-all duration-300 group
                                    ${isSelected ? `bg-white/5 ${opt.color}` : 'bg-transparent border-white/10 hover:border-white/30'}
                                    ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5'}
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-sm bg-black/50 border border-white/10 ${isSelected ? opt.color : 'text-gray-400 group-hover:text-white'}`}>
                                        {opt.icon}
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                            {opt.label}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono leading-relaxed">
                                            {opt.desc}
                                        </p>
                                    </div>
                                </div>
                                
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor] animate-pulse"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
