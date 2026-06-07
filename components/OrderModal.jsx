'use client';
import { useState } from 'react';

export default function OrderModal({ menu, chef, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: menu.id, chef_id: chef.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" 
         style={{ background: 'rgba(0,0,0,0.6)' }}
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-spice-500 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-display text-xl font-semibold">Place Your Order</h2>
            <button onClick={onClose} className="text-orange-200 hover:text-white text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-6">
          {done ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="font-display text-2xl text-spice-700 mb-2">Order Placed!</h3>
              <p className="text-gray-600 mb-4">Check your email for confirmation and payment details.</p>
              <div className="bg-amber-50 rounded-xl p-4 text-sm text-left mb-4 border border-amber-200">
                <p className="font-semibold mb-1">💳 Pay to complete your order:</p>
                <p>UPI: <strong>{chef.payment_phone}</strong></p>
                <p className="mt-1">Amount: <strong>₹{menu.price}</strong></p>
              </div>
              <p className="text-xs text-gray-400">Issues? Email admin@ghar.food</p>
              <button onClick={onClose}
                className="mt-4 px-6 py-2 bg-spice-500 text-white rounded-xl font-semibold hover:bg-spice-600 transition">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Order summary */}
              <div className="flex gap-3 p-3 bg-amber-50 rounded-xl mb-4 border border-amber-200">
                {menu.photo_url && (
                  <img src={menu.photo_url} alt={menu.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-stone-800">{menu.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{menu.meal_type} · by {chef.name}</p>
                  <p className="text-spice-600 font-bold mt-1">₹{menu.price}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Your Name *</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-spice-400 text-sm"
                    placeholder="Ravi Kumar" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Email *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-spice-400 text-sm"
                    placeholder="ravi@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Phone *</label>
                  <input
                    type="tel" required value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-spice-400 text-sm"
                    placeholder="+91 98765 43210" />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-spice-500 hover:bg-spice-600 disabled:bg-spice-300 text-white font-bold py-3 rounded-xl transition">
                  {loading ? 'Placing Order…' : 'Confirm Order →'}
                </button>
              </form>
              <p className="text-center text-xs text-gray-400 mt-3">
                You'll receive a confirmation email with payment QR code
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
