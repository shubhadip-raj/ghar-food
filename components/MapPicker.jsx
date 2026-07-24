'use client';
import { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function RecenterOnChange({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [lat, lng]); // eslint-disable-line
  return null;
}

function AddressGeocoder({ address, onResult }) {
  const lastAddress = useRef('');
  useEffect(() => {
    if (!address || address === lastAddress.current) return;
    lastAddress.current = address;
    const geocode = async () => {
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

// MapPicker now has two states:
// - pendingLat/pendingLng: where the pin is on the map (preview)
// - confirmed: whether user clicked "Confirm Location"
// Only after confirm does onChange() fire with the final lat/lng

export default function MapPicker({ lat, lng, address, onChange }) {
  const markerRef = useRef(null);

  // Internal "draft" pin — not yet confirmed
  const [pendingLat, setPendingLat] = useState(lat || null);
  const [pendingLng, setPendingLng] = useState(lng || null);
  const [confirmed,  setConfirmed]  = useState(false);

  // When geocoder or parent gives us a new lat/lng, update draft pin
  // and reset confirmation
  const handleDraftMove = (newLat, newLng) => {
    setPendingLat(newLat);
    setPendingLng(newLng);
    setConfirmed(false); // needs re-confirmation if pin moved
  };

  // User clicked Confirm
  const handleConfirm = () => {
    if (!pendingLat || !pendingLng) return;
    setConfirmed(true);
    onChange(pendingLat, pendingLng); // only NOW pass to parent
  };

  const hasPin = Boolean(pendingLat && pendingLng);
  const center = hasPin ? [pendingLat, pendingLng] : [20.5937, 78.9629];

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      {/* Map */}
      <MapContainer
        center={center}
        zoom={hasPin ? 16 : 5}
        style={{ height: 260, width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {hasPin && (
          <Marker
            position={[pendingLat, pendingLng]}
            draggable={true}
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const pos = markerRef.current?.getLatLng();
                if (pos) handleDraftMove(pos.lat, pos.lng);
              },
            }}
          />
        )}

        <ClickHandler onPick={handleDraftMove} />
        <RecenterOnChange lat={pendingLat} lng={pendingLng} />
        {address && <AddressGeocoder address={address} onResult={handleDraftMove} />}
      </MapContainer>

      {/* Hint bar */}
      <div style={{
        position: 'absolute', bottom: confirmed ? 54 : 54,
        left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 11,
        padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
        zIndex: 1000, pointerEvents: 'none',
      }}>
        Tap to drop pin · drag to adjust
      </div>

      {/* Confirm button bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 1000, padding: '8px 10px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
      }}>
        {confirmed ? (
          // Confirmed state
          <div style={{
            background: '#16a34a', color: 'white', borderRadius: 12,
            padding: '8px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', fontSize: 13, fontWeight: 600,
          }}>
            <span>✅ Location confirmed</span>
            <button
              onClick={() => { setConfirmed(false); onChange(null, null); }}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none',
                color: 'white', borderRadius: 8, padding: '3px 10px',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              Change
            </button>
          </div>
        ) : (
          // Not yet confirmed
          <button
            onClick={handleConfirm}
            disabled={!hasPin}
            style={{
              width: '100%',
              background: hasPin ? '#f97316' : 'rgba(255,255,255,0.3)',
              color: 'white', border: 'none', borderRadius: 12,
              padding: '10px 16px', fontSize: 13, fontWeight: 700,
              cursor: hasPin ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {hasPin ? '📍 Confirm This Location' : '⏳ Finding your location…'}
          </button>
        )}
      </div>
    </div>
  );
}