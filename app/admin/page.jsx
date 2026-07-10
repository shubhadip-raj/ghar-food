'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState('pending');
  const [chefs, setChefs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetch('/api/auth/admin-login', { method: 'GET' }).then((r) => {
      if (r.ok) { setAuthed(true); fetchAll(); }
    });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      setAuthed(true);
      fetchAll();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const [chefsRes, ordersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/chefs'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/settings'),
      ]);
      const chefsData    = await chefsRes.json();
      const ordersData   = await ordersRes.json();
      const settingsData = await settingsRes.json();
      setChefs(chefsData.chefs || []);
      setOrders(ordersData.orders || []);
      setSettings(settingsData.settings || {});
    } finally {
      setLoading(false);
    }
  }

  async function approveChef(id) {
    await fetch('/api/admin/chefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'approved' }),
    });
    fetchAll();
  }

  async function rejectChef() {
    await fetch('/api/admin/chefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rejectModal, status: 'rejected', reason: rejectReason }),
    });
    setRejectModal(null);
    setRejectReason('');
    fetchAll();
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSavingSettings(false);
    setSettingsMsg(res.ok ? 'Settings saved! ✅' : 'Error saving settings');
    setTimeout(() => setSettingsMsg(''), 3000);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthed(false);
  }

  // ── LOGIN SCREEN ──
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#1c0a00' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="font-display text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-orange-300 text-sm mt-1">Ghar.food</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          {loginError && <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg text-sm">{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-orange-200 mb-1">Email</label>
              <input type="email" required value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-orange-300/50 focus:outline-none focus:border-orange-400"
                placeholder="adam@ghar.food" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-200 mb-1">Password</label>
              <input type="password" required value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-orange-300/50 focus:outline-none focus:border-orange-400"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loginLoading}
              className="w-full bg-spice-500 hover:bg-spice-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition">
              {loginLoading ? 'Logging in…' : 'Login →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const pending  = chefs.filter(c => c.status === 'pending');
  const approved = chefs.filter(c => c.status === 'approved');
  const rejected = chefs.filter(c => c.status === 'rejected');

  const tabStyle = t => `px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === t
    ? 'bg-spice-500 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:border-spice-300'}`;

  const STATUS_COLOR = {
    confirmed:        'bg-blue-100 text-blue-700',
    payment_received: 'bg-green-100 text-green-700',
    shipped:          'bg-purple-100 text-purple-700',
    cancelled:        'bg-red-100 text-red-500',
  };

  // ── Chef Card ──
  const ChefCard = ({ chef, showActions }) => (
    <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex gap-3">
        <img
          src={chef.photo_url || 'https://placehold.co/56x56/f97316/white?text=🏠'}
          alt={chef.name}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-stone-800">{chef.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              chef.status === 'approved' ? 'bg-green-100 text-green-700' :
              chef.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                                           'bg-red-100 text-red-600'}`}>
              {chef.status}
            </span>
          </div>
          <p className="text-sm text-stone-500">{chef.email} • {chef.phone}</p>
          <p className="text-xs text-stone-400 mt-1">{chef.address}</p>
          <p className="text-xs text-stone-400 mt-1">
            <span className="font-medium text-stone-600">Specialties:</span> {chef.recipe_list}
          </p>
          {chef.place_of_origin && (
            <p className="text-xs text-stone-400">
              <span className="font-medium text-stone-600">From:</span> {chef.place_of_origin}
            </p>
          )}

          {/* FSSAI */}
          <div className="mt-3">
            {(chef.fssai_number || chef.fssai_certificate_url) ? (
              <div className="flex flex-wrap items-center gap-2">
                {chef.fssai_number && (
                  <div className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg px-3 py-1">
                    <span className="font-semibold">🏅 FSSAI:</span> {chef.fssai_number}
                  </div>
                )}
                {chef.fssai_certificate_url ? (
                  <a href={chef.fssai_certificate_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 transition">
                    📄 View Certificate
                  </a>
                ) : (
                  <span className="text-xs text-red-600 font-medium">⚠️ Certificate not uploaded</span>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 mt-1">
                <p className="text-xs font-semibold text-red-700">⚠️ FSSAI not submitted</p>
                <p className="text-xs text-red-500 mt-0.5">Ask chef to upload FSSAI details before approval.</p>
              </div>
            )}
          </div>
        </div>
        {chef.kitchen_photo_url && (
          <img src={chef.kitchen_photo_url} alt="Kitchen"
            className="w-14 h-14 rounded-xl object-cover hidden sm:block flex-shrink-0" />
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => approveChef(chef.id)}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-xl transition">
            ✅ Approve
          </button>
          <button onClick={() => setRejectModal(chef.id)}
            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold py-2 rounded-xl transition">
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#FDF6E3' }}>
      {/* Nav */}
      <header className="bg-stone-900 px-5 py-3 flex items-center justify-between">
        <div>
          <Link href="/" className="font-display text-xl font-bold text-spice-400">🏠 Ghar.food</Link>
          <span className="ml-3 text-sm text-stone-400">Admin</span>
        </div>
        <button onClick={logout} className="text-sm text-stone-400 hover:text-white">Logout</button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Pending',        value: pending.length,  icon: '⏳', color: 'text-amber-600' },
            { label: 'Approved Chefs', value: approved.length, icon: '✅', color: 'text-green-600' },
            { label: "Today's Orders", value: orders.filter(o => o.created_at?.startsWith(new Date().toISOString().split('T')[0])).length, icon: '📦', color: 'text-spice-600' },
            { label: 'Total Revenue',  value: `₹${orders.reduce((s, o) => s + (o.amount || 0), 0)}`, icon: '💰', color: 'text-stone-800' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-amber-100 p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-stone-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button className={tabStyle('pending')}  onClick={() => setTab('pending')}>⏳ Pending {pending.length > 0 && `(${pending.length})`}</button>
          <button className={tabStyle('approved')} onClick={() => setTab('approved')}>✅ Chefs</button>
          <button className={tabStyle('orders')}   onClick={() => setTab('orders')}>📦 Orders</button>
          <button className={tabStyle('settings')} onClick={() => setTab('settings')}>⚙️ Settings</button>
        </div>

        {/* ── PENDING ── */}
        {tab === 'pending' && (
          <div className="space-y-3">
            {pending.length === 0
              ? <div className="bg-white rounded-2xl border border-amber-100 p-10 text-center text-stone-400">No pending registrations 🎉</div>
              : pending.map(c => <ChefCard key={c.id} chef={c} showActions={true} />)
            }
          </div>
        )}

        {/* ── APPROVED CHEFS ── */}
        {tab === 'approved' && (
          <div className="space-y-3">
            {approved.length === 0
              ? <div className="bg-white rounded-2xl border border-amber-100 p-10 text-center text-stone-400">No approved chefs yet</div>
              : approved.map(c => <ChefCard key={c.id} chef={c} showActions={false} />)
            }
            {rejected.length > 0 && (
              <>
                <h3 className="font-semibold text-stone-500 mt-6">Rejected</h3>
                {rejected.map(c => <ChefCard key={c.id} chef={c} showActions={false} />)}
              </>
            )}
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0
              ? <div className="bg-white rounded-2xl border border-amber-100 p-10 text-center text-stone-400">No orders yet</div>
              : orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-amber-100 p-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-stone-800">
                          #{order.id.slice(0, 8).toUpperCase()} — {order.customer_name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] || 'bg-stone-100 text-stone-500'}`}>
                          {order.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500">{order.customer_email} · {order.customer_phone}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        👨‍🍳 {order.chefs?.name} &nbsp;|&nbsp; 🍽️ {order.menus?.name}
                        <span className="capitalize"> ({order.menus?.meal_type})</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-spice-600 text-lg">₹{order.amount}</p>
                      <p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleString('en-IN')}</p>
                      {order.menus?.pickup_time && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          🕐 Pickup: {order.menus.pickup_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-amber-100 p-6 space-y-5">
            <h2 className="font-display text-xl font-semibold text-stone-800">⚙️ Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Admin Email</label>
                <input className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400"
                  value={settings.admin_email || ''} onChange={e => setSettings({ ...settings, admin_email: e.target.value })}
                  placeholder="adam@ghar.food" />
                <p className="text-xs text-stone-400 mt-1">Update here then update .env on Vercel</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">New Admin Password</label>
                <input type="password" className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400"
                  value={settings.new_admin_password || ''} onChange={e => setSettings({ ...settings, new_admin_password: e.target.value })}
                  placeholder="Leave blank to keep current" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Resend API Key</label>
                <input className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400"
                  value={settings.resend_api_key || ''} onChange={e => setSettings({ ...settings, resend_api_key: e.target.value })}
                  placeholder="re_xxxxxxxxxx" />
                <p className="text-xs text-stone-400 mt-1">Get free key at resend.com (3000 emails/month)</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">From Email</label>
                <input className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400"
                  value={settings.from_email || ''} onChange={e => setSettings({ ...settings, from_email: e.target.value })}
                  placeholder="noreply@ghar.food" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Max Orders per Meal</label>
                <input type="number" className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400"
                  value={settings.max_orders || 10} onChange={e => setSettings({ ...settings, max_orders: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Site Tagline</label>
                <input className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400"
                  value={settings.tagline || ''} onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                  placeholder="Home-cooked goodness, delivered with love" />
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-2">📋 Vercel Environment Variables Needed:</p>
              <code className="text-xs block bg-amber-100 p-2 rounded-lg whitespace-pre-wrap">{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=noreply@ghar.food
ADMIN_EMAIL=adam@ghar.food
ADMIN_PASSWORD=YourPassword
JWT_SECRET=random-32-char-string`}</code>
            </div>

            {settingsMsg && <p className="text-sm text-green-600 font-semibold">{settingsMsg}</p>}
            <button type="submit" disabled={savingSettings}
              className="bg-spice-500 hover:bg-spice-600 text-white font-bold px-6 py-3 rounded-xl transition">
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-display text-lg font-semibold mb-3">Reject Chef Registration</h3>
            <textarea className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-spice-400"
              rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional, will be emailed to chef)" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl font-semibold hover:bg-stone-50 transition">
                Cancel
              </button>
              <button onClick={rejectChef}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 transition">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}