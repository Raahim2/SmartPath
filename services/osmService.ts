import { Coordinates } from '../types';

interface RouteData {
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  distance: number; // in meters
  duration: number; // in seconds
}

export const fetchRoute = async (start: Coordinates, end: Coordinates): Promise<RouteData | null> => {
  try {
    // Using OSRM Public API (driving profile)
    // Note: Coordinates in URL are {lng},{lat}
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );
    
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('No route found', data);
      return null;
    }

    const route = data.routes[0];
    
    // OSRM returns GeoJSON [lng, lat], map to Leaflet [lat, lng]
    const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

    return {
      coordinates,
      distance: route.distance,
      duration: route.duration
    };
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
};
