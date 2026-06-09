'use client';
import { useState } from 'react';

export default function OrderModal({ menu, chef, onClose }) {
  const [form, setForm]     = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [orderId, setOrderId] = useState('');
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: menu.id, chef_id: chef.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      setOrderId(data.order?.id || '');
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

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
              {/* Order summary */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-green-800 mb-1">✅ Your order is placed!</p>
                <p className="text-green-700">Order ID: <strong>#{orderId.slice(0,8).toUpperCase()}</strong></p>
                <p className="text-green-600 text-xs mt-1">A confirmation email is on its way to <strong>{form.email}</strong></p>
              </div>

              {/* Payment section */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-display font-semibold text-stone-800 mb-3">💳 Complete your payment</p>
                <div className="flex gap-4 items-start">
                  {/* FIX 2: QR code */}
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
                    {/* FIX 6: Chef phone */}
                    <div className="bg-white rounded-lg p-2 border border-amber-100">
                      <p className="text-xs text-stone-400">Chef's contact</p>
                      <p className="font-bold text-stone-800">📞 {chef.phone}</p>
                    </div>
                  </div>
                </div>
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
            /* ── ORDER FORM ── */
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
                  {/* FIX 6: show chef phone in listing */}
                  <p className="text-xs text-stone-400 mt-0.5">📞 {chef.phone}</p>
                  <p className="text-spice-600 font-bold mt-1 text-lg">₹{menu.price}</p>
                </div>
              </div>

              {/* Payment preview (before ordering) */}
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl mb-4 border border-stone-100 text-sm">
                {chef.payment_qr_url
                  ? <img src={chef.payment_qr_url} alt="QR" className="w-12 h-12 object-contain rounded-lg border border-stone-200 bg-white p-0.5" />
                  : <div className="w-12 h-12 bg-stone-200 rounded-lg flex items-center justify-center text-xl">📱</div>
                }
                <div>
                  <p className="font-semibold text-stone-700">Pay ₹{menu.price} to {chef.name}</p>
                  <p className="text-stone-400 text-xs">UPI: {chef.payment_phone} · after confirming below</p>
                </div>
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-3">
                {[
                  { label: 'Your Name', key: 'name', type: 'text',  ph: 'Ravi Kumar' },
                  { label: 'Email',     key: 'email', type: 'email', ph: 'ravi@example.com' },
                  { label: 'Phone',     key: 'phone', type: 'tel',   ph: '+91 98765 43210' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-stone-700 mb-1">{f.label} *</label>
                    <input type={f.type} required value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-spice-400 text-sm"
                      placeholder={f.ph} />
                  </div>
                ))}
                <button type="submit" disabled={loading}
                  className="w-full bg-spice-500 hover:bg-spice-600 disabled:bg-spice-300 text-white font-bold py-3 rounded-xl transition">
                  {loading ? 'Placing Order…' : 'Confirm Order →'}
                </button>
              </form>
              <p className="text-center text-xs text-stone-400 mt-3">You'll receive a confirmation email with the QR code</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
