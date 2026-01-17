export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SearchResult {
  name: string;
  coords: Coordinates;
}

export interface TripSegment {
  mode: 'WALK' | 'DRIVE' | 'TRANSIT' | 'FLIGHT' | 'BIKE' | 'RICKSHAW';
  instruction: string; // e.g., "Take auto-rickshaw to Andheri Station"
  cost: string; // e.g., "₹45"
  distance: string; // e.g., "2.5 km"
  coordinates: Coordinates; // The end point of this segment
}

export interface TripPlan {
  label: string; // e.g., "FASTEST", "ECONOMY", "SCENIC"
  description: string; // e.g., "Via Western Express Highway"
  totalCost: string; // e.g., "₹150 - ₹200"
  currency: string;
  totalDuration: string;
  segments: TripSegment[];
}

export interface HistoryItem {
    id: string;
    start: Coordinates;
    end: Coordinates;
    startLabel: string;
    endLabel: string;
    timestamp: number;
    routeOptions: TripPlan[]; 
    selectedOptionIndex: number; 
}

export interface Airport {
    code: string;
    name: string;
    lat: number;
    lng: number;
    city: string;
}

export interface AirlineInfo {
    name: string;
    country: string;
    website: string; // for logo fetching
}

export interface Flight {
    id: string; // icao24
    flightNumber: string; // callsign
    airlineCode: string; // e.g., "BA" or "BAW"
    airline: AirlineInfo;
    originCountry: string;
    currentPos: Coordinates;
    heading: number; // 0 to 360
    speed: number; // km/h
    altitude: number; // ft
    onGround: boolean;
    aircraft: string; // e.g., "Boeing 787"
    // Computed for visual smoothness
    lastUpdate: number;
}

export interface Place {
    id: string;
    name: string;
    category: string;
    description: string;
    rating: string;
    coordinates: Coordinates;
}

export interface WeatherData {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    humidity: number;
    conditionCode: number; // WMO code
    isDay: number;
    pressure: number;
    locationName: string;
    forecast: {
        time: string[];
        temperature: number[];
    };
}

export type FlightRegion = 'GLOBAL' | 'NA' | 'EU' | 'AS' | 'SA' | 'AF' | 'OC' | 'NEARBY';

export type VisualizationMode = 'ROUTING' | 'FLIGHT' | 'EXPLORE' | 'WEATHER';
