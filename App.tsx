import React from 'react';
import { Visualizer } from './components/Visualizer';
import { Coordinates } from './types';

// Default Center (New York City)
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.0060 };

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      <Visualizer center={DEFAULT_CENTER} />
    </div>
  );
}