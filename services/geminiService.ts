import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, TripPlan, Coordinates, Place } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geocodeLocation = async (query: string): Promise<SearchResult | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the geographical coordinates (latitude and longitude) for the location: "${query}". 
      Return a JSON object with 'latitude', 'longitude', and a canonical 'name'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            latitude: { type: Type.NUMBER },
            longitude: { type: Type.NUMBER },
            name: { type: Type.STRING }
          },
          required: ["latitude", "longitude", "name"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);
    return {
      name: data.name,
      coords: {
        lat: data.latitude,
        lng: data.longitude
      }
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

export const planTripLogistics = async (start: Coordinates, end: Coordinates): Promise<TripPlan[]> => {
  try {
    const prompt = `
      Act as a navigation engine. Plan 3 DISTINCT travel options from ${start.lat},${start.lng} to ${end.lat},${end.lng}.
      
      Option 1: "FASTEST" (Usually Driving/Taxi or Flight if very far).
      Option 2: "TRANSIT" (Public Transport mix - Train, Bus, Metro, etc.).
      Option 3: "ALTERNATIVE" (Walking if < 3km, Bike/Rickshaw if < 10km, or Economy Flight/Train if long distance).

      RULES:
      1. Detect context: Mumbai? Use Rickshaws/Locals. NYC? Subway. Inter-city? Flights/Trains.
      2. REALISTIC PRICING & DURATION.
      3. Create logical waypoints (segments).
      
      Return JSON:
      {
        "options": [
          {
            "label": "FASTEST" | "TRANSIT" | "ALTERNATIVE",
            "description": "Via [Major Road/Line Name]",
            "totalCost": "string range",
            "currency": "symbol",
            "totalDuration": "string",
            "segments": [ ... ]
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                options: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING },
                            description: { type: Type.STRING },
                            totalCost: { type: Type.STRING },
                            currency: { type: Type.STRING },
                            totalDuration: { type: Type.STRING },
                            segments: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        mode: { type: Type.STRING, enum: ['WALK', 'DRIVE', 'TRANSIT', 'FLIGHT', 'BIKE', 'RICKSHAW'] },
                                        instruction: { type: Type.STRING },
                                        cost: { type: Type.STRING },
                                        distance: { type: Type.STRING },
                                        latitude: { type: Type.NUMBER },
                                        longitude: { type: Type.NUMBER }
                                    },
                                    required: ['mode', 'instruction', 'cost', 'latitude', 'longitude']
                                }
                            }
                        },
                        required: ['label', 'totalCost', 'segments']
                    }
                }
            }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text);
    
    if (!data.options || !Array.isArray(data.options)) return [];

    return data.options.map((opt: any) => ({
      label: opt.label,
      description: opt.description || "Route Option",
      totalCost: opt.totalCost,
      currency: opt.currency || "$",
      totalDuration: opt.totalDuration || "Unknown",
      segments: opt.segments.map((seg: any) => ({
        mode: seg.mode,
        instruction: seg.instruction,
        cost: seg.cost,
        distance: seg.distance || "",
        coordinates: {
            lat: seg.latitude,
            lng: seg.longitude
        }
      }))
    }));

  } catch (error) {
    console.error("Logistics planning error:", error);
    return [];
  }
};

export const searchNearbyPlaces = async (center: Coordinates, category: string): Promise<Place[]> => {
    try {
        const prompt = `
            Find 5 to 8 real, existing places of category "${category}" near the coordinates ${center.lat}, ${center.lng}.
            Be as accurate as possible with latitude/longitude.
            
            Return JSON:
            {
                "places": [
                    {
                        "name": "Name of place",
                        "description": "Short 1-liner description",
                        "rating": "4.5 stars",
                        "latitude": number,
                        "longitude": number
                    }
                ]
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        places: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    rating: { type: Type.STRING },
                                    latitude: { type: Type.NUMBER },
                                    longitude: { type: Type.NUMBER }
                                },
                                required: ["name", "latitude", "longitude"]
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if(!text) return [];
        const data = JSON.parse(text);

        if (!data.places || !Array.isArray(data.places)) return [];

        return data.places.map((p: any, i: number) => ({
            id: `place-${i}-${Date.now()}`,
            name: p.name,
            category: category,
            description: p.description || category,
            rating: p.rating || "N/A",
            coordinates: {
                lat: p.latitude,
                lng: p.longitude
            }
        }));

    } catch (error) {
        console.error("Nearby search error:", error);
        return [];
    }
};
