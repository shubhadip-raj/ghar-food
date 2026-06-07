'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// We load Leaflet dynamically to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-amber-50">
    <div className="text-center">
      <div className="text-5xl mb-4 animate-spin">🌀</div>
      <p className="text-spice-600 font-display">Loading the map…</p>
    </div>
  </div>
)});

export default function MapView({ chefs, menus }) {
  return <LeafletMap chefs={chefs} menus={menus} />;
}
