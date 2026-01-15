import L from 'leaflet';
import React from 'react';
import { Plane, Train, Car, Bike, Footprints } from 'lucide-react';

export const createStartIcon = () => L.divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
      <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-cyan-500 drop-shadow-md"></div>
      <div class="absolute w-8 h-8 bg-cyan-400/30 rounded-full animate-ping"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export const createEndIcon = () => L.divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center group transform -translate-x-1/2 -translate-y-1/2">
       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-fuchsia-600 drop-shadow-md">
          <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" fill="rgba(217,70,239,0.3)"/>
          <circle cx="12" cy="10" r="3" fill="currentColor" />
       </svg>
       <div class="absolute -bottom-1 w-4 h-1 bg-fuchsia-500/50 blur-sm rounded-full"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

export const createCheckpointIcon = (index: number, mode: string) => {
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

export const createAirportIcon = (code: string) => L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group">
        <div class="w-2 h-2 bg-blue-500 rounded-full ring-2 ring-blue-500/50 z-10"></div>
        <div class="absolute w-8 h-8 border border-blue-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
        <div class="absolute -top-5 text-[10px] font-mono font-bold text-blue-400 bg-black/80 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            ${code}
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

export const createPlaneIcon = (heading: number, airlineCode: string, isSelected: boolean) => {
    const colorClass = isSelected ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-amber-400 hover:text-white transition-colors duration-200';
    const scale = isSelected ? 'scale-150' : 'hover:scale-125';
    
    return L.divIcon({
        className: 'bg-transparent',
        html: `
        <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 ${scale} transition-transform duration-300 cursor-pointer" style="transform: rotate(${heading}deg);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="${colorClass}">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
        </div>
        ${!isSelected ? `
        <div class="absolute top-0 left-6 text-[8px] font-bold text-amber-200 bg-black/80 border border-amber-500/30 px-1.5 py-0.5 rounded whitespace-nowrap transform -translate-y-2 pointer-events-none hidden group-hover:block">
            ${airlineCode}
        </div>` : ''}
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

export const createPlaceIcon = (name: string, category: string) => {
    // Generate a consistent color based on category char code
    const colors = ['bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500', 'bg-sky-500'];
    const colorClass = colors[category.length % colors.length];

    return L.divIcon({
        className: 'bg-transparent',
        html: `
        <div class="relative flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-full group cursor-pointer">
            <div class="relative">
                 <div class="w-8 h-8 ${colorClass} rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20 group-hover:scale-110 transition-transform">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                 </div>
                 <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white z-10"></div>
            </div>
            
            <div class="mt-2 bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-xl border border-white/20 font-bold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
                ${name}
            </div>
        </div>
        `,
        iconSize: [32, 48],
        iconAnchor: [16, 48]
    });
};
