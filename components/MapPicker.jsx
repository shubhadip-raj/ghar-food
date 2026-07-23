'use client';
import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Click anywhere on map to drop pin
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Fly to new coords when they change externally
function RecenterOnChange({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [lat, lng]); // eslint-disable-line
  return null;
}

// Auto-geocode address and update pin
function AddressGeocoder({ address, onResult }) {
  const lastAddress = useRef('');

  useEffect(() => {
    if (!address || address === lastAddress.current) return;
    lastAddress.current = address;

    const geocode = async () => {
      // Try multiple strategies for Indian addresses
      const pincodeMatch = address.match(/\b(\d{6})\b/);
      const parts = address.split(',').map(p => p.trim()).filter(Boolean);

      const queries = [
        address,
        pincodeMatch ? pincodeMatch[1] : null,
        parts.length > 2 ? parts.slice(-3).join(', ') : null,
        parts.length > 1 ? parts.slice(-2).join(', ') : null,
        parts.length > 0 ? parts[parts.length - 1] : null,
      ].filter(Boolean);

      for (const query of queries) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
          const res  = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'GharFood/1.0' } });
          const data = await res.json();
          if (data && data.length > 0) {
            onResult(parseFloat(data[0].lat), parseFloat(data[0].lon));
            return;
          }
        } catch { }
      }
    };

    geocode();
  }, [address]); // eslint-disable-line

  return null;
}

export default function MapPicker({ lat, lng, address, onChange }) {
  const markerRef = useRef(null);
  const hasPin    = Boolean(lat && lng);
  const center    = hasPin ? [lat, lng] : [20.5937, 78.9629];

  return (
    <div style={{ position: 'relative', height: 260, borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={hasPin ? 16 : 5}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {hasPin && (
          <Marker
            position={[lat, lng]}
            draggable={true}
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const pos = markerRef.current?.getLatLng();
                if (pos) onChange(pos.lat, pos.lng);
              },
            }}
          />
        )}

        <ClickHandler onPick={onChange} />
        <RecenterOnChange lat={lat} lng={lng} />

        {/* Auto-geocode when address changes */}
        {address && <AddressGeocoder address={address} onResult={onChange} />}
      </MapContainer>

      {/* Helper hint */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 11,
        padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
        zIndex: 1000, pointerEvents: 'none',
      }}>
        Tap to drop pin · drag to adjust
      </div>
    </div>
  );
}