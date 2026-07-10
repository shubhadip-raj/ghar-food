'use client';
import { useEffect, useState, useRef } from 'react';

const COOKIE_NAME  = 'ghar_phone';
const COOKIE_DAYS  = 30;

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

const STATUS_CONFIG = {
  confirmed:        { label: 'Confirmed',        color: 'bg-blue-100 text-blue-700',     icon: '✅' },
  payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-700',   icon: '💰' },
  shipped:          { label: 'Ready / Shipped',  color: 'bg-purple-100 text-purple-700', icon: '🚀' },
  cancelled:        { label: 'Cancelled',        color: 'bg-red-100 text-red-500',       icon: '✗'  },
};

const mealEmoji = type => type === 'lunch' ? '🍱' : '🌙';

// ── Kitchen Posts for a menu ──
function KitchenPosts({ chefId, menuId }) {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetch(`/api/chefs/${chefId}/posts?menu_id=${menuId}`)
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [chefId, menuId]);

  if (loading) return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {[1,2,3].map(i => <div key={i} className="aspect-square bg-stone-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (posts.length === 0) return (
    <p className="text-xs text-stone-400 mt-2 italic">No kitchen posts for this order yet.</p>
  );

  return (
    <>
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mt-3 mb-2">
        📸 Live From Kitchen
      </p>
      <div className="grid grid-cols-3 gap-2">
        {posts.map(post => (
          <div key={post.id} className="relative group rounded-xl overflow-hidden cursor-pointer"
            onClick={() => setLightbox(post)}>
            {post.media_type === 'video' ? (
              <video src={post.media_url} className="w-full aspect-square object-cover" />
            ) : (
              <img src={post.media_url} alt={post.caption || ''}
                className="w-full aspect-square object-cover" />
            )}
            {post.media_type === 'video' && (
              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">▶</div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-stone-300">×</button>
          {lightbox.media_type === 'video'
            ? <video src={lightbox.media_url} controls autoPlay
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
                onClick={e => e.stopPropagation()} />
            : <img src={lightbox.media_url} alt={lightbox.caption || ''}
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
                onClick={e => e.stopPropagation()} />}
          {lightbox.caption && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-xl max-w-sm text-center">
              {lightbox.caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Main Modal ──
export default function MyOrdersModal({ onClose }) {
  const [step,     setStep]     = useState('phone'); // 'phone' | 'orders'
  const [phone,    setPhone]    = useState('');
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState({});
  const inputRef = useRef(null);

  // Read phone from cookie on mount
  useEffect(() => {
    const saved = getCookie(COOKIE_NAME);
    if (saved) {
      setPhone(saved);
      fetchOrders(saved);
    } else {
      setStep('phone');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function fetchOrders(ph) {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/orders/my?phone=${encodeURIComponent(ph)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
      setStep('orders');
    } catch (err) {
      setError('❌ ' + err.message);
    } finally { setLoading(false); }
  }

  function handleSubmitPhone(e) {
    e.preventDefault();
    const clean = phone.trim();
    if (!clean || clean.length < 10) { setError('Please enter a valid 10-digit phone number.'); return; }
    setCookie(COOKIE_NAME, clean, COOKIE_DAYS);
    fetchOrders(clean);
  }

  function handleChangePhone() {
    setStep('phone');
    setOrders([]);
    setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function toggleExpand(id) {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 px-5 pt-6 pb-4 border-b border-amber-100 flex-shrink-0">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition">
            ×
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-spice-100 flex items-center justify-center text-2xl flex-shrink-0">
              🛵
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-800">My Orders</h2>
              <p className="text-sm text-stone-500">Today's orders at a glance</p>
            </div>
          </div>

          {/* Phone indicator when on orders step */}
          {step === 'orders' && (
            <div className="mt-3 flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 border border-orange-100">
              <span className="text-sm text-stone-600">📞 {phone}</span>
              <button onClick={handleChangePhone}
                className="text-xs text-spice-600 font-semibold hover:underline">
                Change
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── PHONE STEP ── */}
          {step === 'phone' && (
            <form onSubmit={handleSubmitPhone} className="space-y-4">
              <div className="text-center py-4">
                <div className="text-5xl mb-3">📱</div>
                <p className="text-stone-600 font-medium">Enter your phone number</p>
                <p className="text-stone-400 text-sm mt-1">We'll find your orders placed today</p>
              </div>

              <div>
                <input
                  ref={inputRef}
                  type="tel"
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-lg text-center tracking-widest font-semibold focus:outline-none focus:border-spice-400 bg-white transition"
                />
                <p className="text-xs text-stone-400 text-center mt-1">We'll remember this for 30 days 🍪</p>
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <button type="submit" disabled={loading || phone.length < 10}
                className="w-full bg-spice-500 hover:bg-spice-600 disabled:bg-stone-200 disabled:text-stone-400
                           disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-base">
                {loading ? '🔍 Searching…' : 'Find My Orders →'}
              </button>
            </form>
          )}

          {/* ── ORDERS STEP ── */}
          {step === 'orders' && (
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-28 bg-stone-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">🍽️</div>
                  <p className="font-semibold text-stone-600 mb-1">No orders today</p>
                  <p className="text-stone-400 text-sm">Browse the map and order from a home chef!</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-stone-400 text-center">
                    {orders.length} order{orders.length !== 1 ? 's' : ''} placed today
                  </p>
                  {orders.map(order => {
                    const sc   = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;
                    const isEx = expanded[order.id];
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm">
                        {/* Order card */}
                        <div className="p-4">
                          <div className="flex gap-3">
                            {/* Menu photo */}
                            {order.menus?.photo_url ? (
                              <img src={order.menus.photo_url} alt={order.menus?.name}
                                className="w-16 h-16 rounded-xl object-cover border border-amber-100 flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                                {mealEmoji(order.menus?.meal_type)}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-stone-800 text-sm leading-tight">{order.menus?.name}</p>
                                  <p className="text-xs text-stone-400 capitalize mt-0.5">
                                    {mealEmoji(order.menus?.meal_type)} {order.menus?.meal_type}
                                  </p>
                                  <p className="text-xs text-stone-500 mt-0.5">
                                    👨‍🍳 {order.chefs?.name}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-bold text-spice-600">₹{order.amount}</p>
                                  <p className="text-xs text-stone-400">
                                    {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>

                              {/* Status badge */}
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>
                                  {sc.icon} {sc.label}
                                </span>
                                {order.menus?.pickup_time && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                                    🕐 Pickup: {order.menus.pickup_time}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Toggle kitchen posts */}
                          <button
                            onClick={() => toggleExpand(order.id)}
                            className="mt-3 w-full flex items-center justify-between bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl px-3 py-2 transition text-sm font-medium text-stone-600">
                            <span>📸 Live From Kitchen</span>
                            <span className="text-stone-400 text-xs">{isEx ? '▲ Hide' : '▼ Show'}</span>
                          </button>
                        </div>

                        {/* Kitchen posts — expanded */}
                        {isEx && (
                          <div className="px-4 pb-4 border-t border-amber-50">
                            <KitchenPosts chefId={order.chef_id} menuId={order.menu_id} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}