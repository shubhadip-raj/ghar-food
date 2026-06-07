'use client';
import { useEffect, useRef, useState } from 'react';
import OrderModal from './OrderModal';

export default function LeafletMap({ chefs, menus }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedChef, setSelectedChef] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (mapInstanceRef.current) return;

      // Default center: Mumbai
      const map = L.map(mapRef.current, {
        center: [19.076, 72.877],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Custom chef icon
      const chefIcon = L.divIcon({
        html: `<div style="
          background:#f97316;
          border:3px solid white;
          border-radius:50%;
          width:44px;height:44px;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
          box-shadow:0 4px 12px rgba(249,115,22,0.5);
          cursor:pointer;">🏠</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24],
        className: '',
      });

      const bounds = [];

      chefs.forEach((chef) => {
        if (!chef.lat || !chef.lng) return;
        bounds.push([chef.lat, chef.lng]);

        const chefMenus = (menus || []).filter((m) => m.chef_id === chef.id);
        const lunch = chefMenus.find((m) => m.meal_type === 'lunch');
        const dinner = chefMenus.find((m) => m.meal_type === 'dinner');

        const menuHtml = [lunch, dinner].filter(Boolean).map((m) => `
          <div style="border:1px solid #fed7aa;border-radius:8px;padding:10px;margin:6px 0;background:#fffbeb;">
            ${m.photo_url ? `<img src="${m.photo_url}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;">` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong style="font-size:13px;">${m.name}</strong>
                <div style="font-size:11px;color:#6b7280;text-transform:capitalize;">${m.meal_type}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:700;color:#c2410c;">₹${m.price}</div>
                <div style="font-size:11px;color:#6b7280;">${10 - (m.orders_count || 0)} left</div>
              </div>
            </div>
            ${(m.orders_count || 0) < 10
              ? `<button 
                  onclick="window.__orderMenu('${m.id}','${chef.id}')"
                  style="margin-top:8px;width:100%;background:#f97316;color:white;border:none;padding:7px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">
                  Order Now
                </button>`
              : `<div style="margin-top:8px;text-align:center;color:#ef4444;font-size:12px;font-weight:600;">Fully Booked</div>`
            }
          </div>`).join('');

        const popupContent = `
          <div style="font-family:'Lato',sans-serif;width:240px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <img src="${chef.photo_url || 'https://placehold.co/48x48/f97316/white?text=🏠'}"
                   style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #f97316;">
              <div>
                <div style="font-weight:700;font-size:15px;color:#1c0a00;">${chef.name}</div>
                ${chef.place_of_origin ? `<div style="font-size:12px;color:#6b7280;">📍 From ${chef.place_of_origin}</div>` : ''}
              </div>
            </div>
            ${chef.recipe_list ? `<p style="font-size:12px;color:#6b7280;margin:0 0 8px;border-top:1px solid #fed7aa;padding-top:8px;">🍽️ Specialises in: ${chef.recipe_list}</p>` : ''}
            ${menuHtml || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:8px 0;">No menu posted today</p>'}
          </div>`;

        const marker = L.marker([chef.lat, chef.lng], { icon: chefIcon }).addTo(map);
        marker.bindPopup(popupContent, { maxWidth: 260 });
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }

      // Global handler so popup buttons can trigger React state
      window.__orderMenu = (menuId, chefId) => {
        const menu = (menus || []).find((m) => m.id === menuId);
        const chef = chefs.find((c) => c.id === chefId);
        if (menu && chef) {
          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('ghar:order', { detail: { menu, chef } }));
          map.closePopup();
        }
      };
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Listen for order events from map
  useEffect(() => {
    const handler = (e) => {
      setSelectedMenu(e.detail.menu);
      setSelectedChef(e.detail.chef);
    };
    window.addEventListener('ghar:order', handler);
    return () => window.removeEventListener('ghar:order', handler);
  }, []);

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />
      {selectedMenu && selectedChef && (
        <OrderModal
          menu={selectedMenu}
          chef={selectedChef}
          onClose={() => { setSelectedMenu(null); setSelectedChef(null); }}
        />
      )}
    </>
  );
}
