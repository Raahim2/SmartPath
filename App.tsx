import React from 'react';
import { Visualizer } from './components/Visualizer';
import { Coordinates } from './types';

// Default Center (New York City)
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.0060 };

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans">
      <Visualizer center={DEFAULT_CENTER} />
      
      {/* Aesthetic Overlay Vignette */}
      <div className="absolute inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
}