import React, { useState } from 'react';
import { Coordinates } from '../types';
import { useVisualizerLogic } from '../hooks/useVisualizerLogic';
import { MapLayer } from './MapLayer';
import { LogisticsPanel } from './LogisticsPanel';
import { FlightPanel } from './FlightPanel';
import { ExplorePanel } from './ExplorePanel';
import { ControlBar } from './ControlBar';
import { MapSelectorModal } from './MapSelectorModal';

interface VisualizerProps {
  center: Coordinates;
}

export const Visualizer: React.FC<VisualizerProps> = ({ center }) => {
  const logic = useVisualizerLogic();
  
  // Local UI State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapFlyTrigger, setMapFlyTrigger] = useState<Coordinates | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handlers
  const handleMapClick = (coords: Coordinates) => {
      // If we are in flight mode, clicking the map (bg) deselects
      if (logic.visualizationMode === 'FLIGHT') {
          logic.setSelectedFlightId(null);
          return;
      }

      const coordLabel = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      
      // In Explore Mode, map click sets the search center
      if (logic.visualizationMode === 'EXPLORE') {
          logic.setStartPoint(coords);
          logic.setStartLabel(`PIN: ${coordLabel}`);
          // Reset previous explore results when center changes?
          // logic.handleExploreSearch(logic.exploreCategory || 'Restaurants'); // Optional auto-refresh
          return;
      }

      if (logic.visualizationMode !== 'ROUTING') return;
      
      if (!logic.startPoint) {
          logic.setStartPoint(coords);
          logic.setStartLabel(`PIN: ${coordLabel}`);
      } else if (!logic.endPoint) {
          logic.setEndPoint(coords);
          logic.setEndLabel(`PIN: ${coordLabel}`);
      } else {
          logic.setStartPoint(coords);
          logic.setStartLabel(`PIN: ${coordLabel}`);
          logic.setEndPoint(null);
          logic.setEndLabel("");
      }
  };

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim() || isSearching) return;
      setIsSearching(true);
      
      const coords = await logic.handleGeocode(searchQuery);
      if (coords) {
          setMapFlyTrigger(coords);
          setSearchQuery("");
      }
      setIsSearching(false);
  };

  const handleLocateMe = () => {
      if (!navigator.geolocation) return;
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition((position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          logic.setStartPoint(coords);
          logic.setStartLabel("CURRENT LOCATION");
          logic.setEndPoint(null);
          logic.setEndLabel("");
          setMapFlyTrigger(coords);
          setIsSearching(false);
      });
  };

  // Styles (Dark Mode Hardcoded)
  const styles = {
      bg: 'bg-black',
      vignette: 'bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]',
      panelBg: 'bg-black/80',
      textPrimary: 'text-white',
      shadow: 'shadow-xl',
      titleHighlight: 
          logic.visualizationMode === 'ROUTING' ? 'text-fuchsia-500' : 
          logic.visualizationMode === 'EXPLORE' ? 'text-emerald-500' :
          'text-blue-500'
  };

  return (
    <div className={`relative w-full h-full ${styles.bg} overflow-hidden`}>
      
      {/* 1. Map Layer */}
      <MapLayer 
          center={center}
          mode={logic.visualizationMode}
          startPoint={logic.startPoint}
          endPoint={logic.endPoint}
          currentPlan={logic.currentPlan}
          visualSegments={logic.visualSegments}
          activeFlights={logic.activeFlights}
          selectedFlightId={logic.selectedFlightId}
          onFlightSelect={logic.setSelectedFlightId}
          calculating={logic.calculating}
          onMapClick={handleMapClick}
          flyToCoords={mapFlyTrigger}
          nearbyPlaces={logic.nearbyPlaces}
      />

      {/* 2. Visual Overlays */}
      <div className={`absolute inset-0 pointer-events-none z-10 ${styles.vignette}`} />

      {/* 3. Title */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20 pointer-events-none">
          <div className={`${styles.panelBg} backdrop-blur-md border-l-4 ${
              logic.visualizationMode === 'ROUTING' ? 'border-fuchsia-500' :
              logic.visualizationMode === 'EXPLORE' ? 'border-emerald-500' :
              'border-blue-500'
          } px-3 py-1 md:px-4 md:py-2 ${styles.textPrimary} ${styles.shadow} skew-x-[-10deg]`}>
            <div className="skew-x-[10deg]">
                <h2 className="text-xl md:text-2xl font-black italic tracking-widest uppercase drop-shadow-sm">
                    SMART <span className={styles.titleHighlight}>PATH</span>
                </h2>
                {logic.visualizationMode === 'FLIGHT' && (
                    <div className="text-[10px] text-blue-400 font-mono tracking-widest absolute -bottom-3 left-0 whitespace-nowrap flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span>LIVE GLOBAL TRAFFIC</span>
                    </div>
                )}
            </div>
          </div>
      </div>

      {/* 4. Panels */}
      {/* Routing Panel */}
      {logic.visualizationMode === 'ROUTING' && (
          <LogisticsPanel 
              startPoint={logic.startPoint}
              endPoint={logic.endPoint}
              startLabel={logic.startLabel}
              endLabel={logic.endLabel}
              calculating={logic.calculating}
              routeOptions={logic.routeOptions}
              selectedOptionIndex={logic.selectedOptionIndex}
              currentPlan={logic.currentPlan}
              onCalculate={logic.handleCalculateRoute}
              onSelectOption={logic.setSelectedOptionIndex}
          />
      )}

      {/* Explore Panel */}
      {logic.visualizationMode === 'EXPLORE' && (
          <ExplorePanel
            startPoint={logic.startPoint}
            startLabel={logic.startLabel}
            nearbyPlaces={logic.nearbyPlaces}
            searchingPlaces={logic.searchingPlaces}
            onSearchCategory={logic.handleExploreSearch}
          />
      )}

      {/* Flight Panel (Only when a flight is selected) */}
      {logic.visualizationMode === 'FLIGHT' && (
          <FlightPanel 
            flight={logic.selectedFlight} 
            onClose={() => logic.setSelectedFlightId(null)}
          />
      )}

      {/* 5. Top Right Controls */}
      <ControlBar 
          mode={logic.visualizationMode}
          isSearching={isSearching}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          onLocateMe={handleLocateMe}
          history={logic.history}
          onClearHistory={(e) => { e.stopPropagation(); logic.setHistory([]); }}
          onRestoreHistory={(item) => {
              logic.restoreHistoryItem(item);
              setMapFlyTrigger(item.start);
          }}
          onOpenMapSelector={() => setIsModalOpen(true)}
          flightRegion={logic.flightRegion}
          onSetFlightRegion={logic.setFlightRegion}
      />

      {/* 6. Footer Hint */}
      {(logic.visualizationMode === 'ROUTING' || logic.visualizationMode === 'EXPLORE') && (
      <div className="hidden md:block absolute bottom-10 right-10 z-20 pointer-events-none opacity-70">
         <div className={`flex flex-col items-end gap-1 ${styles.textPrimary} font-bold uppercase tracking-wider text-[10px]`}>
             <div className="flex items-center gap-2">
                 <span className={`bg-white text-black px-1.5 rounded-sm`}>LMB</span>
                 <span>SET {logic.visualizationMode === 'EXPLORE' ? 'SEARCH CENTER' : 'WAYPOINT'}</span>
             </div>
         </div>
      </div>
      )}

      {/* 7. Modal */}
      <MapSelectorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentMode={logic.visualizationMode}
        onSelectMode={logic.setVisualizationMode}
      />

    </div>
  );
};
