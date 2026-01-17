import React from 'react';
import { WeatherData } from '../types';
import { getWeatherConditionLabel } from '../services/weatherService';
import { Cloud, Sun, CloudRain, CloudLightning, CloudSnow, CloudFog, Wind, Droplets, Gauge, MapPin, Loader2 } from 'lucide-react';

interface WeatherPanelProps {
    data: WeatherData | null;
    label: string;
    loading: boolean;
}

const WeatherIcon = ({ code, className = "" }: { code: number, className?: string }) => {
    const { iconType } = getWeatherConditionLabel(code);
    switch(iconType) {
        case 'sun': return <Sun className={`${className} text-amber-400`} />;
        case 'rain': return <CloudRain className={`${className} text-blue-400`} />;
        case 'storm': return <CloudLightning className={`${className} text-purple-400`} />;
        case 'snow': return <CloudSnow className={`${className} text-white`} />;
        case 'fog': return <CloudFog className={`${className} text-gray-400`} />;
        default: return <Cloud className={`${className} text-gray-300`} />;
    }
};

export const WeatherPanel: React.FC<WeatherPanelProps> = ({ data, label, loading }) => {
    
    // Styles
    const styles = {
        panelBg: 'bg-black/80',
        textPrimary: 'text-white',
        textSecondary: 'text-gray-400',
        border: 'border-white/10',
        shadow: 'shadow-xl'
    };

    if (loading) {
         return (
             <div className="absolute top-20 right-4 z-20 w-80">
                 <div className={`${styles.panelBg} backdrop-blur-md border border-cyan-500/30 p-4 rounded-sm flex items-center justify-center gap-2`}>
                     <Loader2 size={20} className="text-cyan-400 animate-spin" />
                     <span className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Scanning Atmosphere...</span>
                 </div>
             </div>
         );
    }

    if (!data) return null;

    const condition = getWeatherConditionLabel(data.conditionCode);

    return (
        <div className="absolute top-20 right-4 z-20 w-80 pointer-events-auto">
            {/* Card */}
            <div className={`${styles.panelBg} backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] rounded-sm overflow-hidden flex flex-col skew-x-[-2deg]`}>
                
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-900/40 to-black p-4 border-b border-cyan-500/20 skew-x-[2deg]">
                     <div className="flex items-start justify-between">
                         <div>
                             <div className="flex items-center gap-1.5 mb-1">
                                 <MapPin size={12} className="text-cyan-500" />
                                 <span className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold">Target Sector</span>
                             </div>
                             <h2 className="text-lg font-black text-white tracking-wide uppercase truncate max-w-[200px]">{label || "Unknown Location"}</h2>
                         </div>
                         <div className="text-right">
                             <div className="text-3xl font-black text-white">{Math.round(data.temperature)}°</div>
                         </div>
                     </div>
                </div>

                {/* Main Body */}
                <div className="p-4 space-y-4 skew-x-[2deg]">
                    
                    {/* Condition */}
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-sm">
                        <div className="bg-black/50 p-3 rounded-full border border-white/5 shadow-inner">
                            <WeatherIcon code={data.conditionCode} className="w-8 h-8" />
                        </div>
                        <div>
                             <div className="text-sm font-bold text-white uppercase tracking-wider">{condition.label}</div>
                             <div className="text-[10px] text-gray-500 font-mono">CODE: {data.conditionCode} // {data.isDay ? 'DAY' : 'NIGHT'}</div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 border border-white/10 p-2 rounded-sm flex flex-col items-center justify-center gap-1">
                            <Wind size={16} className="text-gray-400" />
                            <div className="text-lg font-bold text-white font-mono">{data.windSpeed} <span className="text-[10px]">km/h</span></div>
                            <div className="text-[9px] text-gray-500 uppercase">Wind Spd</div>
                        </div>
                         <div className="bg-white/5 border border-white/10 p-2 rounded-sm flex flex-col items-center justify-center gap-1">
                            <Droplets size={16} className="text-blue-400" />
                            <div className="text-lg font-bold text-white font-mono">{data.humidity}%</div>
                            <div className="text-[9px] text-gray-500 uppercase">Humidity</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-2 rounded-sm flex flex-col items-center justify-center gap-1 col-span-2">
                            <Gauge size={16} className="text-emerald-400" />
                            <div className="text-lg font-bold text-white font-mono">{data.pressure} <span className="text-[10px]">hPa</span></div>
                            <div className="text-[9px] text-gray-500 uppercase">Barometric Pressure</div>
                        </div>
                    </div>

                    {/* Mini Forecast Graph (Visual Only) */}
                    <div className="pt-2 border-t border-white/10">
                        <div className="text-[9px] text-gray-500 uppercase mb-2">24H Trend</div>
                        <div className="flex items-end gap-1 h-12">
                            {data.forecast.temperature.filter((_, i) => i % 3 === 0).map((temp, i) => {
                                // normalize height
                                const min = Math.min(...data.forecast.temperature);
                                const max = Math.max(...data.forecast.temperature);
                                const heightPercent = ((temp - min) / (max - min || 1)) * 80 + 20;
                                
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                        <div 
                                            className="w-full bg-cyan-500/50 hover:bg-cyan-400 transition-all rounded-t-sm relative" 
                                            style={{ height: `${heightPercent}%` }}
                                        ></div>
                                        <span className="text-[8px] text-gray-600 font-mono">{Math.round(temp)}°</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};