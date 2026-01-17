import { Coordinates, WeatherData } from "../types";

// Fetch latest radar timestamps from RainViewer for the map layer
export const fetchRadarConfiguration = async (): Promise<number | null> => {
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        // data.radar.past contains array of timestamps. Last one is most recent.
        if (data.radar && data.radar.past && data.radar.past.length > 0) {
            return data.radar.past[data.radar.past.length - 1].time;
        }
        return null;
    } catch (e) {
        console.error("Error fetching radar config", e);
        return null;
    }
};

// Fetch spot weather data from OpenMeteo
export const fetchWeatherData = async (coords: Coordinates): Promise<WeatherData | null> => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m&timezone=auto&forecast_days=1`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!data.current) return null;

        return {
            locationName: "Selected Location", // We'll handle naming in the UI via geocoding if needed
            temperature: data.current.temperature_2m,
            windSpeed: data.current.wind_speed_10m,
            windDirection: data.current.wind_direction_10m,
            humidity: data.current.relative_humidity_2m,
            conditionCode: data.current.weather_code,
            isDay: data.current.is_day,
            pressure: data.current.surface_pressure,
            forecast: {
                time: data.hourly.time.slice(0, 24), // Next 24 hours
                temperature: data.hourly.temperature_2m.slice(0, 24)
            }
        };

    } catch (e) {
        console.error("Weather fetch error", e);
        return null;
    }
};

export const getWeatherConditionLabel = (code: number): { label: string, iconType: string } => {
    // WMO Weather interpretation codes (WW)
    if (code === 0) return { label: 'Clear Sky', iconType: 'sun' };
    if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', iconType: 'cloud' };
    if (code >= 45 && code <= 48) return { label: 'Fog', iconType: 'fog' };
    if (code >= 51 && code <= 55) return { label: 'Drizzle', iconType: 'rain' };
    if (code >= 61 && code <= 65) return { label: 'Rain', iconType: 'rain' };
    if (code >= 71 && code <= 77) return { label: 'Snow', iconType: 'snow' };
    if (code >= 80 && code <= 82) return { label: 'Showers', iconType: 'rain' };
    if (code >= 95) return { label: 'Thunderstorm', iconType: 'storm' };
    return { label: 'Unknown', iconType: 'cloud' };
};
