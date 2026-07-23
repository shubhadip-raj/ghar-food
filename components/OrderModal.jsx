'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-56 bg-stone-100 rounded-xl flex items-center justify-center">
      <p className="text-stone-400 text-sm">⏳ Loading map…</p>
    </div>
  )
});

async function geocodeAddress(address) {
  try {
    const pincodeMatch = address.match(/\b(\d{6})\b/);
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    const queries = [
      address,
      pincodeMatch ? pincodeMatch[1] : null,
      parts.length > 2 ? parts.slice(-3).join(', ') : null,
      parts.length > 1 ? parts.slice(-2).join(', ') : null,
    ].filter(Boolean);

    for (const query of queries) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'GharFood/1.0' } });
      const data = await res.json();
      if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { }
  return null;
}

export default function OrderModal({ menu, chef, onClose }) {
  const [form, setForm]             = useState({ name: '', email: '', phone: '', delivery_address: '' });
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState('');
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [orderId, setOrderId]       = useState('');
  const [error, setError]           = useState('');

  const handleAddressBlur = async () => {
    if (!form.delivery_address.trim()) return;
    setGeocodeStatus('loading');
    const coords = await geocodeAddress(form.delivery_address);
    if (coords) {
      setDeliveryLat(coords.lat);
      setDeliveryLng(coords.lng);
      setGeocodeStatus('success');
    } else {
      setGeocodeStatus('failed');
    }
  };

  const handlePinChange = (lat, lng) => {
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    setGeocodeStatus('success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { setError('Please fill in all fields.'); return; }
    if (!form.delivery_address.trim()) { setError('Please enter your delivery address.'); return; }
    if (!deliveryLat || !deliveryLng) { setError('Please confirm your location on the map.'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_id: menu.id,
          chef_id: chef.id,
          ...form,
          delivery_lat: deliveryLat,
          delivery_lng: deliveryLng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      setOrderId(data.order?.id || '');
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-spice-400 text-sm";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-spice-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-display text-xl font-semibold">
            {done ? '🎉 Order Confirmed!' : 'Place Your Order'}
          </h2>
          <button onClick={onClose} className="text-orange-200 hover:text-white text-3xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">

          {/* ── SUCCESS STATE ── */}
          {done ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-green-800 mb-1">✅ Your order is placed!</p>
                <p className="text-green-700">Order ID: <strong>#{orderId.slice(0,8).toUpperCase()}</strong></p>
                <p className="text-green-600 text-xs mt-1">A confirmation email is on its way to <strong>{form.email}</strong></p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-display font-semibold text-stone-800 mb-3">💳 Complete your payment</p>
                <div className="flex gap-4 items-start">
                  {chef.payment_qr_url ? (
                    <div className="flex-shrink-0 text-center">
                      <img src={chef.payment_qr_url} alt="Payment QR"
                        className="w-28 h-28 object-contain border-2 border-amber-200 rounded-xl bg-white p-1" />
                      <p className="text-xs text-stone-400 mt-1">Scan to pay</p>
                    </div>
                  ) : (
                    <div className="w-28 h-28 bg-amber-100 rounded-xl flex items-center justify-center text-4xl flex-shrink-0">📱</div>
                  )}
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="bg-white rounded-lg p-2 border border-amber-100">
                      <p className="text-xs text-stone-400">Amount to pay</p>
                      <p className="font-bold text-2xl text-spice-600">₹{menu.price}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-amber-100">
                      <p className="text-xs text-stone-400">UPI / PhonePe / GPay</p>
                      <p className="font-bold text-stone-800">{chef.payment_phone}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-amber-100">
                      <p className="text-xs text-stone-400">Chef's contact</p>
                      <p className="font-bold text-stone-800">📞 {chef.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery address confirmation */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
                <p className="text-xs text-stone-400 mb-0.5">📦 Delivering to</p>
                <p className="font-medium text-stone-700">{form.delivery_address}</p>
              </div>

              <p className="text-center text-xs text-stone-400">
                Issues? Email <a href="mailto:admin@ghar.food" className="text-spice-600 underline">admin@ghar.food</a>
              </p>
              <button onClick={onClose}
                className="w-full bg-spice-500 hover:bg-spice-600 text-white font-bold py-3 rounded-xl transition">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Dish summary */}
              <div className="flex gap-3 p-3 bg-amber-50 rounded-xl mb-4 border border-amber-100">
                {menu.photo_url && (
                  <img src={menu.photo_url} alt={menu.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-stone-800">{menu.name}</p>
                  <p className="text-sm text-stone-500 capitalize">{menu.meal_type} · by <strong>{chef.name}</strong></p>
                  <p className="text-xs text-stone-400 mt-0.5">📞 {chef.phone}</p>
                  <p className="text-spice-600 font-bold mt-1 text-lg">₹{menu.price}</p>
                </div>
              </div>

              {/* Payment preview */}
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl mb-4 border border-stone-100 text-sm">
                {chef.payment_qr_url
                  ? <img src={chef.payment_qr_url} alt="QR" className="w-12 h-12 object-contain rounded-lg border border-stone-200 bg-white p-0.5" />
                  : <div className="w-12 h-12 bg-stone-200 rounded-lg flex items-center justify-center text-xl">📱</div>}
                <div>
                  <p className="font-semibold text-stone-700">Pay ₹{menu.price} to {chef.name}</p>
                  <p className="text-stone-400 text-xs">UPI: {chef.payment_phone} · after confirming below</p>
                </div>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-3">
                {[
                  { label: 'Your Name', key: 'name',  type: 'text',  ph: 'Ravi Kumar' },
                  { label: 'Email',     key: 'email', type: 'email', ph: 'ravi@example.com' },
                  { label: 'Phone',     key: 'phone', type: 'tel',   ph: '+91 98765 43210' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-stone-700 mb-1">{f.label} *</label>
                    <input type={f.type} required value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className={inputCls} placeholder={f.ph} />
                  </div>
                ))}

                {/* Delivery Address */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Delivery Address *
                  </label>
                  <textarea rows={2} required value={form.delivery_address}
                    onChange={e => {
                      setForm({ ...form, delivery_address: e.target.value });
                      if (deliveryLat || deliveryLng) {
                        setDeliveryLat(null); setDeliveryLng(null); setGeocodeStatus('');
                      }
                    }}
                    onBlur={handleAddressBlur}
                    className={inputCls}
                    placeholder="Flat 4B, Sunrise Apartments, MG Road, Bangalore 560001"
                  />

                  {geocodeStatus === 'loading' && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span className="animate-spin inline-block">⏳</span> Finding your location…
                    </p>
                  )}
                  {geocodeStatus === 'failed' && (
                    <p className="text-xs text-red-500 mt-1">
                      Couldn't find automatically — tap your location on the map below.
                    </p>
                  )}
                  {geocodeStatus === 'success' && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Location found — drag pin to exact spot if needed.
                    </p>
                  )}
                  {geocodeStatus === '' && form.delivery_address.trim() && (
                    <button type="button" onClick={handleAddressBlur}
                      className="text-xs text-spice-600 font-semibold mt-1">
                      📍 Find on map
                    </button>
                  )}
                </div>

                {/* Map pin picker */}
                {(geocodeStatus === 'success' || geocodeStatus === 'failed') && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      📍 Drag pin to your exact door
                    </label>
                    <div className="rounded-2xl overflow-hidden border-2 border-spice-200">
                      <MapPicker lat={deliveryLat} lng={deliveryLng} address={form.delivery_address} onChange={handlePinChange} />
                    </div>
                    {deliveryLat && deliveryLng && (
                      <p className="text-xs text-stone-400 text-center">
                        {deliveryLat.toFixed(5)}, {deliveryLng.toFixed(5)}
                      </p>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-spice-500 hover:bg-spice-600 disabled:bg-spice-300 text-white font-bold py-3 rounded-xl transition">
                  {loading ? 'Placing Order…' : 'Confirm Order →'}
                </button>
              </form>
              <p className="text-center text-xs text-stone-400 mt-3">
                You'll receive a confirmation email with the QR code
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}