'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

async function uploadViaServer(file, bucket) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('bucket', bucket);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

function getISTHour() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  return parseInt(s);
}
// FIX 1: Updated windows
const canPostLunch = () => { const h = getISTHour(); return h >= 0 && h < 10; };
const canPostDinner = () => { const h = getISTHour(); return h >= 8 && h < 18; };

// FIX 5: Order status helpers
const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', next: 'payment_received' },
  payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-700', next: 'shipped' },
  shipped: { label: 'Shipped / Ready', color: 'bg-purple-100 text-purple-700', next: null },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-500', next: null },
};
const STATUS_NEXT_LABEL = {
  confirmed: '✅ Mark Payment Received',
  payment_received: '🚀 Mark as Shipped / Ready',
};

// change menusection -(new MenuSection) 
const MenuSection = ({
  type,
  form,
  setForm,
  menus,
  saving,
  inputCls,
  msg,
  postMenu,
  toggleMenu
}) => {

  const menu = menus[type];
  const canPost = type === 'lunch' ? canPostLunch() : canPostDinner();
  const window_ = type === 'lunch'
    ? '12:00 midnight – 10:00 AM IST'
    : '8:00 AM – 6:00 PM IST';
  const emoji = type === 'lunch' ? '🍱' : '🌙';

  return (
    <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display text-lg font-semibold capitalize">{emoji} {type} Menu</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${canPost ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
          {canPost ? '🟢 Window open' : `⏰ ${window_}`}
        </span>
      </div>

      {menu ? (
        <div className="space-y-3">
          <div className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            {menu.photo_url && <img src={menu.photo_url} alt={menu.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
            <div className="flex-1">
              <p className="font-semibold text-stone-800">{menu.name}</p>
              {menu.description && <p className="text-xs text-stone-400 mt-0.5">{menu.description}</p>}
              <div className="flex items-center gap-3 mt-1">
                <span className="font-bold text-spice-600">₹{menu.price}</span>
                <span className="text-xs text-stone-400">{menu.orders_count || 0}/10 orders</span>
              </div>
            </div>
          </div>
          <button onClick={() => toggleMenu(menu.id, menu.is_available)}
            className={`w-full text-sm py-2.5 rounded-xl font-semibold transition border ${menu.is_available ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'}`}>
            {menu.is_available ? '✅ Live — Tap to Pause' : '⏸ Paused — Tap to Go Live'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {!canPost && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              ⏰ Posting window for {type}: <strong>{window_}</strong>
            </div>
          )}
          <input className={inputCls} placeholder={`Today's ${type} dish name *`}
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className={inputCls} placeholder="Price ₹ *"
              value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            <label className={`flex items-center gap-2 ${inputCls} cursor-pointer`}>
              {form.preview ? <img src={form.preview} className="h-6 w-6 rounded object-cover" alt="preview" /> : <span>📷</span>}
              <span className="text-stone-400 text-xs">{form.preview ? 'Change' : 'Food photo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files[0];
                if (f) setForm(p => ({ ...p, photo: f, preview: URL.createObjectURL(f) }));
              }} />
            </label>
          </div>
          <textarea className={inputCls} rows={2} placeholder="Description (optional)"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          {msg[type] && <p className="text-sm font-medium text-spice-600">{msg[type]}</p>}
          <button onClick={() => postMenu(type)} disabled={saving[type] || !canPost}
            title={!canPost ? `Window: ${window_}` : undefined}
            className="w-full bg-spice-500 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl hover:bg-spice-600 transition">
            {saving[type] ? 'Posting…' : `Post ${type.charAt(0).toUpperCase() + type.slice(1)} Menu`}
          </button>
        </div>
      )}
    </div>
  );
};

export default function ChefDashboard() {
  const router = useRouter();
  const [chef, setChef] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menus, setMenus] = useState({ lunch: null, dinner: null });
  const [tab, setTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [lunchForm, setLunchForm] = useState({ name: '', price: '', description: '', photo: null, preview: '' });
  const [dinnerForm, setDinnerForm] = useState({ name: '', price: '', description: '', photo: null, preview: '' });
  const [saving, setSaving] = useState({ lunch: false, dinner: false });
  const [msg, setMsg] = useState({ lunch: '', dinner: '' });
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [chefRes, ordersRes, menusRes] = await Promise.all([
        fetch('/api/chefs/me'),
        fetch('/api/orders?mine=true'),
        fetch('/api/menus?mine=true'),
      ]);
      if (chefRes.status === 401) { router.push('/chef/login'); return; }
      const [chefData, ordersData, menusData] = await Promise.all([
        chefRes.json(), ordersRes.json(), menusRes.json(),
      ]);
      setChef(chefData.chef);
      setOrders(ordersData.orders || []);
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const todayMenus = (menusData.menus || []).filter(m => m.date === today);
      setMenus({
        lunch: todayMenus.find(m => m.meal_type === 'lunch') || null,
        dinner: todayMenus.find(m => m.meal_type === 'dinner') || null,
      });
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function postMenu(type) {
    const form = type === 'lunch' ? lunchForm : dinnerForm;
    if (!form.name || !form.price) {
      setMsg(p => ({ ...p, [type]: 'Please add a dish name and price.' })); return;
    }
    setSaving(p => ({ ...p, [type]: true }));
    setMsg(p => ({ ...p, [type]: '' }));
    try {
      let photo_url = '';
      if (form.photo) photo_url = await uploadViaServer(form.photo, 'menu-photos');
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, price: form.price, description: form.description, meal_type: type, photo_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(p => ({ ...p, [type]: '✅ Menu posted!' }));
      type === 'lunch'
        ? setLunchForm({ name: '', price: '', description: '', photo: null, preview: '' })
        : setDinnerForm({ name: '', price: '', description: '', photo: null, preview: '' });
      fetchAll();
    } catch (err) { setMsg(p => ({ ...p, [type]: '❌ ' + err.message })); }
    finally { setSaving(p => ({ ...p, [type]: false })); }
  }

  async function toggleMenu(menuId, current) {
    await fetch(`/api/menus/${menuId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !current }),
    });
    fetchAll();
  }

  // FIX 5: Update order status
  async function updateOrderStatus(orderId, newStatus) {
    setUpdatingOrder(orderId);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchAll();
    } finally { setUpdatingOrder(null); }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FDF6E3' }}>
      <div className="text-center"><div className="text-4xl animate-bounce mb-3">🍳</div>
        <p className="font-display text-spice-600">Loading your kitchen…</p></div>
    </div>
  );

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayOrders = orders.filter(o => o.created_at?.slice(0, 10) === today);
  const totalToday = todayOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const inputCls = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400 bg-white transition";


  // change menusection -( inputs are not working properly) 
  // ── Menu section for lunch or dinner ──
  // const MenuSection = ({ type }) => {
  //   const menu = menus[type];
  //   const form = type === 'lunch' ? lunchForm : dinnerForm;
  //   const setForm = type === 'lunch' ? setLunchForm : setDinnerForm;
  //   const canPost = type === 'lunch' ? canPostLunch() : canPostDinner();
  //   // FIX 1: correct window labels
  //   const window_ = type === 'lunch' ? '12:00 midnight – 10:00 AM IST' : '8:00 AM – 6:00 PM IST';
  //   const emoji = type === 'lunch' ? '🍱' : '🌙';

  //   return (
  //     <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-4">
  //       <div className="flex items-center justify-between flex-wrap gap-2">
  //         <h3 className="font-display text-lg font-semibold capitalize">{emoji} {type} Menu</h3>
  //         <span className={`text-xs px-2 py-1 rounded-full font-medium ${canPost ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
  //           {canPost ? '🟢 Window open' : `⏰ ${window_}`}
  //         </span>
  //       </div>

  //       {menu ? (
  //         <div className="space-y-3">
  //           <div className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
  //             {menu.photo_url && <img src={menu.photo_url} alt={menu.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
  //             <div className="flex-1">
  //               <p className="font-semibold text-stone-800">{menu.name}</p>
  //               {menu.description && <p className="text-xs text-stone-400 mt-0.5">{menu.description}</p>}
  //               <div className="flex items-center gap-3 mt-1">
  //                 <span className="font-bold text-spice-600">₹{menu.price}</span>
  //                 <span className="text-xs text-stone-400">{menu.orders_count || 0}/10 orders</span>
  //               </div>
  //             </div>
  //           </div>
  //           <button onClick={() => toggleMenu(menu.id, menu.is_available)}
  //             className={`w-full text-sm py-2.5 rounded-xl font-semibold transition border ${menu.is_available ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
  //                 : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'}`}>
  //             {menu.is_available ? '✅ Live — Tap to Pause' : '⏸ Paused — Tap to Go Live'}
  //           </button>
  //         </div>
  //       ) : (
  //         <div className="space-y-3">
  //           {!canPost && (
  //             <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
  //               ⏰ Posting window for {type}: <strong>{window_}</strong>
  //             </div>
  //           )}
  //           <input className={inputCls} placeholder={`Today's ${type} dish name *`}
  //             value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
  //           <div className="grid grid-cols-2 gap-3">
  //             <input type="number" className={inputCls} placeholder="Price ₹ *"
  //               value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
  //             <label className={`flex items-center gap-2 ${inputCls} cursor-pointer`}>
  //               {form.preview ? <img src={form.preview} className="h-6 w-6 rounded object-cover" alt="preview" /> : <span>📷</span>}
  //               <span className="text-stone-400 text-xs">{form.preview ? 'Change' : 'Food photo'}</span>
  //               <input type="file" accept="image/*" className="hidden" onChange={e => {
  //                 const f = e.target.files[0];
  //                 if (f) setForm(p => ({ ...p, photo: f, preview: URL.createObjectURL(f) }));
  //               }} />
  //             </label>
  //           </div>
  //           <textarea className={inputCls} rows={2} placeholder="Description (optional)"
  //             value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
  //           {msg[type] && <p className="text-sm font-medium text-spice-600">{msg[type]}</p>}
  //           <button onClick={() => postMenu(type)} disabled={saving[type] || !canPost}
  //             title={!canPost ? `Window: ${window_}` : undefined}
  //             className="w-full bg-spice-500 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl hover:bg-spice-600 transition">
  //             {saving[type] ? 'Posting…' : `Post ${type.charAt(0).toUpperCase() + type.slice(1)} Menu`}
  //           </button>
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  return (
    <div className="min-h-screen" style={{ background: '#FDF6E3' }}>
      {/* Header */}
      <header className="bg-white border-b border-amber-100 shadow-sm px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-xl font-bold text-spice-600">🏠 Ghar.food</Link>
          <span className="text-sm text-stone-400 hidden sm:block">Chef Dashboard</span>
        </div>
        {chef && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {chef.photo_url
                ? <img src={chef.photo_url} alt={chef.name} className="w-8 h-8 rounded-full object-cover border-2 border-spice-300" />
                : <div className="w-8 h-8 rounded-full bg-spice-100 flex items-center justify-center">🧑‍🍳</div>}
              <span className="text-sm font-semibold text-stone-700 hidden sm:block">{chef.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${chef.status === 'approved' ? 'bg-green-100 text-green-700' :
                chef.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                {chef.status === 'approved' ? '✅ Live' : chef.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
              </span>
            </div>
            <button onClick={logout} className="text-sm text-stone-400 hover:text-stone-600">Logout</button>
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '📦', label: "Today's Orders", val: todayOrders.length, color: 'text-spice-600' },
            { icon: '💰', label: 'Revenue Today', val: `₹${totalToday}`, color: 'text-green-600' },
            { icon: '🍽️', label: 'Total Orders', val: orders.length, color: 'text-stone-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-amber-100 p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-stone-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[['orders', '📦 Orders'], ['menu', "🍴 Today's Menu"], ['profile', '👤 Profile']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === k ? 'bg-spice-500 text-white shadow-sm' : 'bg-white text-stone-600 border border-stone-200 hover:border-spice-300'
                }`}>{l}</button>
          ))}
        </div>

        {/* ── ORDERS tab ── */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {todayOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-amber-100 p-10 text-center">
                <div className="text-4xl mb-3">🍽️</div>
                <p className="text-stone-400">No orders yet today — post your menu and they'll come!</p>
              </div>
            ) : todayOrders.map(order => {
              const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;
              const nextStatus = sc.next;
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-amber-100 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-stone-800">{order.customer_name}</p>
                        {/* FIX 5: status badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                      </div>
                      <p className="text-sm text-stone-500">{order.customer_email}</p>
                      <p className="text-sm text-stone-500 font-medium">📞 {order.customer_phone}</p>
                      <p className="text-xs text-stone-400 mt-1 capitalize">{order.menus?.name} · {order.menus?.meal_type}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-xl text-spice-600">₹{order.amount}</p>
                      <p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  {/* FIX 5: action buttons */}
                  {nextStatus && (
                    <button
                      onClick={() => updateOrderStatus(order.id, nextStatus)}
                      disabled={updatingOrder === order.id}
                      className="w-full bg-spice-50 border border-spice-200 hover:bg-spice-100 text-spice-700 text-sm font-semibold py-2 rounded-xl transition disabled:opacity-50">
                      {updatingOrder === order.id ? 'Updating…' : STATUS_NEXT_LABEL[order.status]}
                    </button>
                  )}
                </div>
              );
            })}
            {orders.length > todayOrders.length && (
              <details className="bg-white rounded-2xl border border-amber-100 p-4">
                <summary className="cursor-pointer text-sm text-stone-500 font-semibold">Show past orders ({orders.length - todayOrders.length})</summary>
                <div className="mt-3 space-y-2">
                  {orders.filter(o => o.created_at?.slice(0, 10) !== today).map(order => {
                    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;
                    return (
                      <div key={order.id} className="flex justify-between items-center text-sm p-2 border-t border-stone-100">
                        <div>
                          <span>{order.customer_name} · {order.menus?.name}</span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                        </div>
                        <span className="font-semibold text-spice-600">₹{order.amount}</span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ── MENU tab ── */}
        {tab === 'menu' && (
          chef?.status === 'approved' ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* <MenuSection type="lunch" />
              <MenuSection type="dinner" /> */}
              {/* Change MenuSection render */}
              <MenuSection
                type="lunch"
                form={lunchForm}
                setForm={setLunchForm}
                menus={menus}
                saving={saving}
                inputCls={inputCls}
                msg={msg}
                postMenu={postMenu}
                toggleMenu={toggleMenu}
              />

              <MenuSection
                type="dinner"
                form={dinnerForm}
                setForm={setDinnerForm}
                menus={menus}
                saving={saving}
                inputCls={inputCls}
                msg={msg}
                postMenu={postMenu}
                toggleMenu={toggleMenu}
              />
            </div>
          ) : (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-10 text-center">
              <div className="text-4xl mb-3">{chef?.status === 'rejected' ? '✗' : '⏳'}</div>
              <h3 className="font-display text-xl font-semibold text-stone-700">
                {chef?.status === 'rejected' ? 'Registration Rejected' : 'Awaiting Admin Approval'}
              </h3>
              <p className="text-stone-500 text-sm mt-2">
                {chef?.status === 'rejected'
                  ? 'Your profile was not approved. Contact admin@ghar.food for more info.'
                  : 'You will receive an email once approved — usually within 24 hours.'}
              </p>
            </div>
          )
        )}

        {/* ── PROFILE tab ── */}
        {tab === 'profile' && chef && (
          <div className="bg-white rounded-2xl border border-amber-100 p-6 space-y-5">
            <div className="flex gap-4">
              <img src={chef.photo_url || 'https://placehold.co/80x80/f97316/white?text=🧑‍🍳'}
                alt={chef.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-100" />
              {chef.kitchen_photo_url && (
                <img src={chef.kitchen_photo_url} alt="Kitchen" className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-100" />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[['Name', chef.name], ['Email', chef.email], ['Phone', chef.phone],
              ['UPI Number', chef.payment_phone], ['Origin', chef.place_of_origin || '—'], ['Status', chef.status]
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide">{k}</p>
                  <p className="text-stone-700 mt-0.5 font-medium">{v}</p>
                </div>
              ))}
              <div className="col-span-full p-3 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide">Specialties</p>
                <p className="text-stone-700 mt-0.5">{chef.recipe_list}</p>
              </div>
              <div className="col-span-full p-3 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide">Address</p>
                <p className="text-stone-700 mt-0.5">{chef.address}</p>
              </div>
            </div>
            {chef.payment_qr_url && (
              <div>
                <p className="text-sm font-semibold text-stone-600 mb-2">💳 Payment QR Code</p>
                <img src={chef.payment_qr_url} alt="QR Code" className="w-36 h-36 object-contain border border-stone-200 rounded-xl p-2 bg-white" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
