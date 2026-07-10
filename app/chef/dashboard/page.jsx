'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImagePickerModal from '@/components/ImagePickerModal';

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
const canPostLunch  = () => { const h = getISTHour(); return h >= 0  && h < 10; };
const canPostDinner = () => { const h = getISTHour(); return h >= 10 && h < 18; };

const STATUS_CONFIG = {
  confirmed:        { label: 'Confirmed',        color: 'bg-blue-100 text-blue-700',     next: 'payment_received' },
  payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-700',   next: 'shipped' },
  shipped:          { label: 'Ready for Pickup', color: 'bg-purple-100 text-purple-700', next: null },
  cancelled:        { label: 'Cancelled',        color: 'bg-red-100 text-red-500',       next: null },
};
const STATUS_NEXT_LABEL = {
  confirmed:        '✅ Mark Payment Received',
  payment_received: '🍱 Mark as Ready for Pickup',
};

// ── Photo Picker Button (inside MenuSection) ──
function PhotoPickerButton({ form, setForm, inputCls }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={`flex items-center gap-2 ${inputCls} cursor-pointer`}
      >
        {form.preview
          ? <img src={form.preview} className="h-6 w-6 rounded object-cover flex-shrink-0" alt="preview" />
          : <span>📷</span>}
        <span className="text-stone-400 text-xs truncate">
          {form.preview ? 'Change photo' : 'Choose food photo'}
        </span>
      </button>

      {pickerOpen && (
        <ImagePickerModal
          onSelect={url => setForm(p => ({ ...p, photo: null, preview: url, photo_url_direct: url }))}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ── Pickup Menu Card (shown when menu is live) ──
function PickupMenuCard({ menu, toggleMenu, inputCls }) {
  const [pickupTime,  setPickupTime]  = useState(menu.pickup_time || '');
  const [saving,      setSaving]      = useState(false);
  const [pickupMsg,   setPickupMsg]   = useState('');

  async function savePickupTime() {
    if (!pickupTime.trim()) return;
    setSaving(true); setPickupMsg('');
    try {
      const res = await fetch(`/api/menus/${menu.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup_time: pickupTime.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setPickupMsg('✅ Pickup time saved!');
      setTimeout(() => setPickupMsg(''), 3000);
    } catch { setPickupMsg('❌ Failed to save'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      {/* Menu info */}
      <div className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
        {menu.photo_url && <img src={menu.photo_url} alt={menu.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
        <div className="flex-1">
          <p className="font-semibold text-stone-800">{menu.name}</p>
          {menu.description && <p className="text-xs text-stone-400 mt-0.5">{menu.description}</p>}
          <div className="flex items-center gap-3 mt-1">
            <span className="font-bold text-spice-600">₹{menu.price}</span>
            <span className="text-xs text-stone-400">{menu.orders_count || 0}/10 orders</span>
          </div>
          {menu.pickup_time && (
            <p className="text-xs text-green-700 font-semibold mt-1">🕐 Pickup: {menu.pickup_time}</p>
          )}
        </div>
      </div>

      {/* Pickup time input */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-3 space-y-2">
        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block">
          🕐 Set Pickup Time
        </label>
        <div className="flex gap-2">
          <input
            className={`flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-spice-400 bg-white transition`}
            placeholder="e.g. 1:00 PM or 8:30 PM"
            value={pickupTime}
            onChange={e => setPickupTime(e.target.value)}
          />
          <button onClick={savePickupTime} disabled={saving || !pickupTime.trim()}
            className="bg-spice-500 hover:bg-spice-600 disabled:bg-stone-200 disabled:text-stone-400
                       text-white text-sm font-semibold px-4 rounded-xl transition">
            {saving ? '…' : 'Save'}
          </button>
        </div>
        {pickupMsg && <p className="text-xs font-medium text-spice-600">{pickupMsg}</p>}
      </div>

      {/* Live / Pause toggle */}
      <button onClick={() => toggleMenu(menu.id, menu.is_available)}
        className={`w-full text-sm py-2.5 rounded-xl font-semibold transition border ${menu.is_available
          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
          : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'}`}>
        {menu.is_available ? '✅ Live — Tap to Pause' : '⏸ Paused — Tap to Go Live'}
      </button>
    </div>
  );
}

// ── Menu Section ──
const MenuSection = ({ type, form, setForm, menus, saving, inputCls, msg, postMenu, toggleMenu, onPickupTimeSaved }) => {
  const menu    = menus[type];
  const canPost = type === 'lunch' ? canPostLunch() : canPostDinner();
  const window_ = type === 'lunch' ? '12:00 midnight – 10:00 AM IST' : '10:00 AM – 6:00 PM IST';
  const emoji   = type === 'lunch' ? '🍱' : '🌙';
  const [pickupTime,    setPickupTime]    = useState(menu?.pickup_time || '');
  const [savingPickup,  setSavingPickup]  = useState(false);
  const [pickupMsg,     setPickupMsg]     = useState('');

  async function savePickupTime() {
    if (!pickupTime.trim() || !menu?.id) return;
    setSavingPickup(true); setPickupMsg('');
    try {
      const res = await fetch(`/api/menus/${menu.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup_time: pickupTime.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setPickupMsg('✅ Pickup time saved!');
      if (onPickupTimeSaved) onPickupTimeSaved();
    } catch { setPickupMsg('❌ Failed to save'); }
    finally { setSavingPickup(false); }
  }
  return (
    <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display text-lg font-semibold capitalize">{emoji} {type} Menu</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${canPost ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
          {canPost ? '🟢 Window open' : `⏰ ${window_}`}
        </span>
      </div>
      {menu ? (
        <PickupMenuCard menu={menu} toggleMenu={toggleMenu} inputCls={inputCls} />
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
            <PhotoPickerButton form={form} setForm={setForm} inputCls={inputCls} />
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

// ── Gallery Section ──
function GallerySection({ uploadViaServer }) {
  const [images,     setImages]     = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [galleryMsg, setGalleryMsg] = useState('');
  const fileInputRef = useRef(null);

  const fetchGallery = useCallback(async () => {
    const res = await fetch('/api/chefs/gallery');
    const data = await res.json();
    if (res.ok) setImages(data.images || []);
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  async function handleAddImages(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true); setGalleryMsg('');
    try {
      for (const file of files) {
        const url = await uploadViaServer(file, 'chef-gallery');
        const res = await fetch('/api/chefs/gallery', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_url: url }),
        });
        if (!res.ok) throw new Error('Failed to save image');
      }
      setGalleryMsg(`✅ ${files.length} image${files.length > 1 ? 's' : ''} added!`);
      fetchGallery();
    } catch (err) { setGalleryMsg('❌ ' + err.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await fetch('/api/chefs/gallery', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      fetchGallery();
    } finally { setDeletingId(null); }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-semibold text-stone-700">📸 My Gallery</h3>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-spice-500 hover:bg-spice-600 disabled:bg-stone-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
          {uploading ? '⏳ Uploading…' : '+ Add Images'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} />
      </div>
      {galleryMsg && <p className="text-sm font-medium text-spice-600 mb-3">{galleryMsg}</p>}
      {images.length === 0 ? (
        <div className="border-2 border-dashed border-amber-200 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-2">🖼️</div>
          <p className="text-stone-400 text-sm">No gallery images yet.</p>
          <p className="text-stone-400 text-xs mt-1">Click "Add Images" to upload your kitchen &amp; food photos!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group aspect-square">
              <img src={img.photo_url} alt="Gallery" className="w-full h-full object-cover rounded-xl border border-amber-100" />
              <button onClick={() => handleDelete(img.id)} disabled={deletingId === img.id}
                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold
                           opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow">
                {deletingId === img.id ? '…' : '×'}
              </button>
            </div>
          ))}
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="aspect-square border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center
                       text-amber-400 hover:border-spice-400 hover:text-spice-500 transition cursor-pointer">
            <span className="text-2xl">+</span><span className="text-xs mt-1">Add</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── FSSAI Section ──
function FssaiSection({ chef, onSaved, uploadViaServer, inputCls }) {
  const [number,      setNumber]      = useState(chef.fssai_number || '');
  const [certPreview, setCertPreview] = useState(chef.fssai_certificate_url || '');
  const [certFile,    setCertFile]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState('');
  const fileInputRef = useRef(null);

  async function handleSave() {
    setSaving(true); setMsg('');
    try {
      let cert_url = certPreview;
      if (certFile) cert_url = await uploadViaServer(certFile, 'chef-fssai');
      const res = await fetch('/api/chefs/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fssai_number: number, fssai_certificate_url: cert_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('✅ FSSAI details saved!');
      setCertFile(null);
      if (onSaved) onSaved(data.chef);
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="mt-6 border-t border-stone-100 pt-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏅</span>
        <h3 className="font-display text-base font-semibold text-stone-700">FSSAI Certificate</h3>
        {chef.fssai_number && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ Verified</span>}
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1 block">FSSAI License Number</label>
          <input className={inputCls} placeholder="e.g. 11224999000123" maxLength={14}
            value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, ''))} />
          <p className="text-xs text-stone-400 mt-1">14-digit FSSAI license number</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1 block">FSSAI Certificate</label>
          {certPreview ? (
            <div className="relative inline-block">
              <img src={certPreview} alt="FSSAI Certificate"
                className="w-full max-w-xs h-40 object-cover rounded-xl border border-amber-100 cursor-pointer"
                onClick={() => window.open(certPreview, '_blank')} />
              <button onClick={() => { setCertPreview(''); setCertFile(null); }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow">×</button>
              <p className="text-xs text-stone-400 mt-1">Click image to view full size</p>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-amber-200 hover:border-spice-400 rounded-xl p-6 text-center transition cursor-pointer">
              <div className="text-2xl mb-1">📄</div>
              <p className="text-sm text-stone-500">Click to upload certificate</p>
              <p className="text-xs text-stone-400 mt-0.5">JPG, PNG or PDF</p>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => {
            const f = e.target.files[0];
            if (f) { setCertFile(f); setCertPreview(URL.createObjectURL(f)); }
          }} />
        </div>
        {number && number.length === 14 && (
          <a href={`https://foscos.fssai.gov.in/index.php/search-foscos/result?search_type=lic&string=${number}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-spice-600 hover:underline font-medium">
            🔍 Verify on FSSAI website →
          </a>
        )}
        {msg && <p className="text-sm font-medium text-spice-600">{msg}</p>}
        <button onClick={handleSave} disabled={saving || (!number && !certFile)}
          className="w-full bg-spice-500 hover:bg-spice-600 disabled:bg-stone-200 disabled:text-stone-400
                     disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition">
          {saving ? 'Saving…' : 'Save FSSAI Details'}
        </button>
      </div>
    </div>
  );
}

// ── From Kitchen Section ──
function FromKitchenSection({ uploadViaServer, inputCls, menus }) {
  const [posts,          setPosts]          = useState([]);
  const [caption,        setCaption]        = useState('');
  const [mediaFile,      setMediaFile]      = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [mediaType,      setMediaType]      = useState(null);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [uploading,      setUploading]      = useState(false);
  const [deletingId,     setDeletingId]     = useState(null);
  const [msg,            setMsg]            = useState('');
  const [lightbox,       setLightbox]       = useState(null);
  const fileInputRef = useRef(null);

  const MAX_SIZE_MB = 50;
  const menuOptions = Object.values(menus).filter(Boolean);
  const mealEmoji   = type => type === 'lunch' ? '🍱' : '🌙';
  const today       = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const fetchPosts = useCallback(async () => {
    const res  = await fetch('/api/chefs/posts');
    const data = await res.json();
    if (res.ok) setPosts(data.posts || []);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) { setMsg(`❌ File too large (${sizeMB.toFixed(1)}MB). Max is ${MAX_SIZE_MB}MB.`); return; }
    setMediaFile(f);
    setMediaType(f.type.startsWith('video/') ? 'video' : 'image');
    setPreview(URL.createObjectURL(f));
    setMsg('');
  }

  async function handlePost() {
    if (!mediaFile) return;
    if (!selectedMenuId) { setMsg('❌ Please select a menu to link before posting.'); return; }
    setUploading(true); setMsg('');
    try {
      const url = await uploadViaServer(mediaFile, 'kitchen-posts');
      const res = await fetch('/api/chefs/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_url: url, media_type: mediaType, caption, menu_id: selectedMenuId }),
      });
      if (!res.ok) throw new Error('Failed to post');
      setMsg('✅ Posted!');
      setMediaFile(null); setPreview(null); setMediaType(null); setCaption(''); setSelectedMenuId('');
      fetchPosts();
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setUploading(false); }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await fetch('/api/chefs/posts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      fetchPosts();
    } finally { setDeletingId(null); }
  }

  // Only show today's posts that have a menu linked
  const todayPosts = posts.filter(p => p.menu_id && p.created_at?.slice(0, 10) === today);

  return (
    <div className="space-y-5">

      {/* No menu posted yet — block the whole section */}
      {menuOptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-amber-100 p-10 text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="font-semibold text-stone-600 mb-1">Post a menu first!</p>
          <p className="text-stone-400 text-sm">You need to post at least one menu today before sharing kitchen photos or videos.</p>
        </div>
      ) : (
        <>
          {/* Upload card */}
          <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-4">
            <h3 className="font-display text-base font-semibold text-stone-700">📸 Share a moment from your kitchen</h3>

            {/* Menu selector — shown first, required */}
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1 block">
                🔗 Link to Today's Menu <span className="text-red-400">*</span>
              </label>
              <select className={inputCls} value={selectedMenuId} onChange={e => setSelectedMenuId(e.target.value)}>
                <option value="">— Select a menu —</option>
                {menuOptions.map(m => (
                  <option key={m.id} value={m.id}>{mealEmoji(m.meal_type)} {m.name} ({m.meal_type})</option>
                ))}
              </select>
            </div>

            {/* Media picker — only shown after menu is selected */}
            {selectedMenuId && (
              <>
                {preview ? (
                  <div className="relative">
                    {mediaType === 'video'
                      ? <video src={preview} controls className="w-full max-h-64 rounded-xl object-cover border border-amber-100" />
                      : <img src={preview} alt="Preview" className="w-full max-h-64 rounded-xl object-cover border border-amber-100" />}
                    <button onClick={() => { setMediaFile(null); setPreview(null); setMediaType(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold shadow text-sm">×</button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-amber-200 hover:border-spice-400 rounded-2xl py-10 text-center transition cursor-pointer">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-stone-500 font-medium">Tap to add photo or video</p>
                    <p className="text-xs text-stone-400 mt-1">Max 50MB · JPG, PNG, MP4, MOV</p>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

                <textarea className={inputCls} rows={2} placeholder="Add a caption… (optional)"
                  value={caption} onChange={e => setCaption(e.target.value)} />
              </>
            )}

            {msg && <p className="text-sm font-medium text-spice-600">{msg}</p>}

            <button onClick={handlePost} disabled={uploading || !mediaFile || !selectedMenuId}
              className="w-full bg-spice-500 hover:bg-spice-600 disabled:bg-stone-200 disabled:text-stone-400
                         disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition">
              {uploading ? '⏳ Uploading…' : '📸 Post to Kitchen'}
            </button>
          </div>

          {/* Today's posts — only those with menu linked */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold text-stone-600">Today's Kitchen Posts</h3>
              <span className="text-xs text-stone-400">{todayPosts.length} post{todayPosts.length !== 1 ? 's' : ''}</span>
            </div>

            {todayPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
                <div className="text-3xl mb-2">📷</div>
                <p className="text-stone-400 text-sm">No posts yet today — share your first kitchen moment!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {todayPosts.map(post => (
                  <div key={post.id} className="relative group rounded-2xl overflow-hidden border border-amber-100 bg-white">
                    {post.media_type === 'video'
                      ? <video src={post.media_url} className="w-full aspect-square object-cover cursor-pointer" onClick={() => setLightbox(post)} />
                      : <img src={post.media_url} alt={post.caption || 'Kitchen post'} className="w-full aspect-square object-cover cursor-zoom-in" onClick={() => setLightbox(post)} />}

                    {/* Video badge */}
                    {post.media_type === 'video' && (
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">▶ Video</div>
                    )}

                    {/* Menu tag */}
                    {post.menus && (
                      <div className="absolute top-2 left-2 bg-spice-500/90 text-white text-xs px-2 py-0.5 rounded-full mt-6">
                        {mealEmoji(post.menus.meal_type)} {post.menus.name}
                      </div>
                    )}

                    {/* Caption overlay */}
                    {post.caption && (
                      <div className="absolute bottom-8 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                        <p className="text-white text-xs line-clamp-2">{post.caption}</p>
                      </div>
                    )}

                    {/* Delete button */}
                    <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 text-sm font-bold
                                 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow">
                      {deletingId === post.id ? '…' : '×'}
                    </button>

                    {/* Time */}
                    <div className="px-3 py-2 text-xs text-stone-400">
                      {new Date(post.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-stone-300">×</button>
          {lightbox.media_type === 'video'
            ? <video src={lightbox.media_url} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
            : <img src={lightbox.media_url} alt={lightbox.caption || ''} className="max-w-full max-h-full rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />}
          {lightbox.caption && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-xl max-w-sm text-center">
              {lightbox.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ──
export default function ChefDashboard() {
  const router = useRouter();
  const [chef,          setChef]          = useState(null);
  const [orders,        setOrders]        = useState([]);
  const [menus,         setMenus]         = useState({ lunch: null, dinner: null });
  const [tab,           setTab]           = useState('orders');
  const [loading,       setLoading]       = useState(true);
  const [lunchForm,     setLunchForm]     = useState({ name: '', price: '', description: '', photo: null, preview: '' });
  const [dinnerForm,    setDinnerForm]    = useState({ name: '', price: '', description: '', photo: null, preview: '' });
  const [saving,        setSaving]        = useState({ lunch: false, dinner: false });
  const [msg,           setMsg]           = useState({ lunch: '', dinner: '' });
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
        lunch:  todayMenus.find(m => m.meal_type === 'lunch')  || null,
        dinner: todayMenus.find(m => m.meal_type === 'dinner') || null,
      });
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function postMenu(type) {
    const form = type === 'lunch' ? lunchForm : dinnerForm;
    if (!form.name || !form.price) { setMsg(p => ({ ...p, [type]: 'Please add a dish name and price.' })); return; }
    setSaving(p => ({ ...p, [type]: true })); setMsg(p => ({ ...p, [type]: '' }));
    try {
      let photo_url = '';
      if (form.photo_url_direct) photo_url = form.photo_url_direct; // picked from existing
      else if (form.photo) photo_url = await uploadViaServer(form.photo, 'menu-photos');
      const res = await fetch('/api/menus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, price: form.price, description: form.description, meal_type: type, photo_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(p => ({ ...p, [type]: '✅ Menu posted!' }));
      type === 'lunch'
        ? setLunchForm({ name: '', price: '', description: '', photo: null, preview: '', photo_url_direct: '' })
        : setDinnerForm({ name: '', price: '', description: '', photo: null, preview: '', photo_url_direct: '' });
      fetchAll();
    } catch (err) { setMsg(p => ({ ...p, [type]: '❌ ' + err.message })); }
    finally { setSaving(p => ({ ...p, [type]: false })); }
  }

  async function toggleMenu(menuId, current) {
    await fetch(`/api/menus/${menuId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !current }),
    });
    fetchAll();
  }

  async function updateOrderStatus(orderId, newStatus) {
    setUpdatingOrder(orderId);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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

  const today       = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayOrders = orders.filter(o => o.created_at?.slice(0, 10) === today);
  const totalToday  = todayOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const inputCls    = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400 bg-white transition";

  const TABS = [
    { key: 'orders',  label: '📦 Orders' },
    { key: 'menu',    label: "🍴 Today's Menu" },
    { key: 'profile', label: '👤 Profile' },
    { key: 'kitchen', label: '📸 Live From Kitchen' },
  ];

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
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                chef.status === 'approved' ? 'bg-green-100 text-green-700' :
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
            { icon: '💰', label: 'Revenue Today',  val: `₹${totalToday}`,   color: 'text-green-600' },
            { icon: '🍽️', label: 'Total Orders',   val: orders.length,      color: 'text-stone-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-amber-100 p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-stone-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap flex-shrink-0 ${
                tab === key ? 'bg-spice-500 text-white shadow-sm' : 'bg-white text-stone-600 border border-stone-200 hover:border-spice-300'}`}>
              {label}
            </button>
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
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-amber-100 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-stone-800">{order.customer_name}</p>
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
                  {sc.next && (
                    <button onClick={() => updateOrderStatus(order.id, sc.next)} disabled={updatingOrder === order.id}
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
              <MenuSection type="lunch"  form={lunchForm}  setForm={setLunchForm}  menus={menus} saving={saving} inputCls={inputCls} msg={msg} postMenu={postMenu} toggleMenu={toggleMenu} />
              <MenuSection type="dinner" form={dinnerForm} setForm={setDinnerForm} menus={menus} saving={saving} inputCls={inputCls} msg={msg} postMenu={postMenu} toggleMenu={toggleMenu} />
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
              <img src={chef.photo_url || 'https://placehold.co/80x80/f97316/white?text=Chef'}
                alt={chef.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-100" />
              {chef.kitchen_photo_url && (
                <img src={chef.kitchen_photo_url} alt="Kitchen" className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-100" />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Name', chef.name], ['Email', chef.email], ['Phone', chef.phone],
                ['UPI Number', chef.payment_phone], ['Origin', chef.place_of_origin || '—'], ['Status', chef.status],
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
            <FssaiSection chef={chef} inputCls={inputCls} uploadViaServer={uploadViaServer}
              onSaved={updatedChef => setChef(prev => ({ ...prev, ...updatedChef }))} />
            <GallerySection uploadViaServer={uploadViaServer} />
          </div>
        )}

        {/* ── FROM KITCHEN tab ── */}
        {tab === 'kitchen' && (
          <FromKitchenSection uploadViaServer={uploadViaServer} inputCls={inputCls} menus={menus} />
        )}
      </div>
    </div>
  );
}