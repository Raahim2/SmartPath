import { Airport, Coordinates, AirlineInfo, FlightRegion } from "../types";

export const MAJOR_AIRPORTS: Airport[] = [
    // North America
    { code: 'JFK', name: 'John F. Kennedy', city: 'New York', lat: 40.6413, lng: -73.7781 },
    { code: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', lat: 33.9416, lng: -118.4085 },
    { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', lat: 37.6213, lng: -122.3790 },
    { code: 'ORD', name: 'O\'Hare', city: 'Chicago', lat: 41.9742, lng: -87.9073 },
    { code: 'LHR', name: 'Heathrow', city: 'London', lat: 51.4700, lng: -0.4543 },
    { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', lat: 49.0097, lng: 2.5479 },
    { code: 'DXB', name: 'Dubai Intl', city: 'Dubai', lat: 25.2532, lng: 55.3657 },
    { code: 'HND', name: 'Haneda', city: 'Tokyo', lat: 35.5494, lng: 139.7798 },
    { code: 'SIN', name: 'Changi', city: 'Singapore', lat: 1.3644, lng: 103.9915 },
    { code: 'HKG', name: 'Hong Kong Intl', city: 'Hong Kong', lat: 22.3080, lng: 113.9185 },
];

// Expanded Airline Database (ICAO codes commonly used in OpenSky)
export const AIRLINE_DATABASE: Record<string, AirlineInfo> = {
    'BAW': { name: 'British Airways', country: 'United Kingdom', website: 'britishairways.com' },
    'AAL': { name: 'American Airlines', country: 'USA', website: 'aa.com' },
    'UAE': { name: 'Emirates', country: 'UAE', website: 'emirates.com' },
    'SIA': { name: 'Singapore Airlines', country: 'Singapore', website: 'singaporeair.com' },
    'DAL': { name: 'Delta Air Lines', country: 'USA', website: 'delta.com' },
    'UAL': { name: 'United Airlines', country: 'USA', website: 'united.com' },
    'DLH': { name: 'Lufthansa', country: 'Germany', website: 'lufthansa.com' },
    'AFR': { name: 'Air France', country: 'France', website: 'airfrance.com' },
    'QFA': { name: 'Qantas', country: 'Australia', website: 'qantas.com' },
    'CPA': { name: 'Cathay Pacific', country: 'Hong Kong', website: 'cathaypacific.com' },
    'AIC': { name: 'Air India', country: 'India', website: 'airindia.com' },
    'IGO': { name: 'IndiGo', country: 'India', website: 'goindigo.in' },
    'JAL': { name: 'Japan Airlines', country: 'Japan', website: 'jal.co.jp' },
    'ANA': { name: 'All Nippon Airways', country: 'Japan', website: 'ana.co.jp' },
    'QTR': { name: 'Qatar Airways', country: 'Qatar', website: 'qatarairways.com' },
    'VIR': { name: 'Virgin Atlantic', country: 'United Kingdom', website: 'virginatlantic.com' },
    'ETH': { name: 'Ethiopian Airlines', country: 'Ethiopia', website: 'ethiopianairlines.com' },
    'SAA': { name: 'South African Airways', country: 'South Africa', website: 'flysaa.com' },
    'LAN': { name: 'LATAM Airlines', country: 'Chile', website: 'latam.com' },
    'TAM': { name: 'LATAM Airlines', country: 'Brazil', website: 'latam.com' },
    'TVF': { name: 'Transavia France', country: 'France', website: 'transavia.com' },
    'KLM': { name: 'KLM', country: 'Netherlands', website: 'klm.com' },
    'RYR': { name: 'Ryanair', country: 'Ireland', website: 'ryanair.com' },
    'EZY': { name: 'easyJet', country: 'UK', website: 'easyjet.com' },
    'AXB': { name: 'Air India Express', country: 'India', website: 'airindiaexpress.in' },
    'AKJ': { name: 'Akasa Air', country: 'India', website: 'akasaair.com' },
    'SEJ': { name: 'SpiceJet', country: 'India', website: 'spicejet.com' },
    'GOW': { name: 'Go First', country: 'India', website: 'flygofirst.com' },
    'VTI': { name: 'Vistara', country: 'India', website: 'airvistara.com' },
    'THY': { name: 'Turkish Airlines', country: 'Turkey', website: 'turkishairlines.com' },
    'SAS': { name: 'SAS', country: 'Scandinavia', website: 'flysas.com' },
};

export const getAirlineFromCallsign = (callsign: string): { code: string, info: AirlineInfo } => {
    const cleanCallsign = callsign.trim().toUpperCase();
    // Try 3 letter ICAO code
    const code = cleanCallsign.slice(0, 3);
    
    if (AIRLINE_DATABASE[code]) {
        return { code, info: AIRLINE_DATABASE[code] };
    }

    // Default Fallback
    return { 
        code: code, 
        info: { name: 'Private / Other', country: 'Unknown', website: '' } 
    };
};

export const getRegionBounds = (region: FlightRegion, customCenter?: Coordinates) => {
    switch (region) {
        case 'NEARBY':
            if (!customCenter) return null;
            // Approx 3-4 degrees box around center (~300-400km)
            return {
                minLat: customCenter.lat - 3,
                maxLat: customCenter.lat + 3,
                minLng: customCenter.lng - 3,
                maxLng: customCenter.lng + 3
            };
        case 'NA': return { minLat: 15, maxLat: 70, minLng: -170, maxLng: -50 };
        case 'EU': return { minLat: 35, maxLat: 70, minLng: -25, maxLng: 40 };
        case 'AS': return { minLat: -10, maxLat: 55, minLng: 60, maxLng: 150 };
        case 'SA': return { minLat: -60, maxLat: 15, minLng: -90, maxLng: -30 };
        case 'AF': return { minLat: -40, maxLat: 40, minLng: -20, maxLng: 55 };
        case 'OC': return { minLat: -50, maxLat: 0, minLng: 110, maxLng: 180 };
        case 'GLOBAL': default: return null;
    }
};

export const fetchOpenSkyFlights = async (region: FlightRegion, userCenter?: Coordinates) => {
    try {
        let url = 'https://opensky-network.org/api/states/all';
        
        const bounds = getRegionBounds(region, userCenter);
        if (bounds) {
            url += `?lamin=${bounds.minLat}&lomin=${bounds.minLng}&lamax=${bounds.maxLat}&lomax=${bounds.maxLng}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`OpenSky API Limited/Error: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        return data.states || [];
    } catch (e) {
        console.error("OpenSky API Error", e);
        return [];
    }
};

// Calculate bearing (heading) between two points
export const calculateBearing = (startLat: number, startLng: number, destLat: number, destLng: number): number => {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

// Calculate new position based on point, bearing, distance
export const projectPosition = (lat: number, lng: number, bearing: number, distanceKm: number): Coordinates => {
    const R = 6371; // Earth radius in km
    const d = distanceKm;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lng * Math.PI / 180;
    const brng = bearing * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) +
        Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));
    
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
        Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));

    return {
        lat: lat2 * 180 / Math.PI,
        lng: lon2 * 180 / Math.PI
    };
};

// Interpolate point along a GREAT CIRCLE path (Orthodrome)
export const interpolateGeodesic = (start: Coordinates, end: Coordinates, fraction: number): Coordinates => {
    const lat1 = (start.lat * Math.PI) / 180;
    const lon1 = (start.lng * Math.PI) / 180;
    const lat2 = (end.lat * Math.PI) / 180;
    const lon2 = (end.lng * Math.PI) / 180;

    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)));

    if (d === 0) return start;

    const A = Math.sin((1 - fraction) * d) / Math.sin(d);
    const B = Math.sin(fraction * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    return {
        lat: (lat * 180) / Math.PI,
        lng: (lon * 180) / Math.PI
    };
};
