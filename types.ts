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