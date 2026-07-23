'use client';
import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-stone-100 rounded-xl flex items-center justify-center">
      <p className="text-stone-400 text-sm">⏳ Loading map…</p>
    </div>
  )
});

async function uploadViaServer(file, bucket) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('bucket', bucket);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password2: '',
    address: '', place_of_origin: '', recipe_list: '', bio: '',
    payment_phone: '', lat: null, lng: null,
  });
  const [files, setFiles] = useState({ photo: null, kitchen_photo: null, payment_qr: null });
  const [previews, setPreviews] = useState({});

  const update = (field, value) => setForm(p => ({ ...p, [field]: value }));
  const handleFile = (field, file) => {
    if (!file) return;
    setFiles(p => ({ ...p, [field]: file }));
    setPreviews(p => ({ ...p, [field]: URL.createObjectURL(file) }));
  };

  // When address field loses focus — show the map
  // MapPicker will auto-geocode from the address prop
  const handleAddressBlur = () => {
    if (form.address.trim().length > 5) setShowMap(true);
  };

  // Called when chef drags/clicks pin on map
  const handlePinChange = (lat, lng) => {
    setForm(p => ({ ...p, lat, lng }));
  };

  const handleStep2Continue = () => {
    setError('');
    if (!form.address.trim()) { setError('Please enter your address'); return; }
    if (!showMap) { setShowMap(true); return; }
    if (!form.lat || !form.lng) {
      setError('Please wait for the map to load and confirm your pin location.');
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!files.photo) { setError('Please upload a profile photo'); return; }
    if (!files.payment_qr) { setError('Please upload your UPI QR code'); return; }
    if (!form.lat || !form.lng) { setError('Please go back and confirm your location on the map.'); return; }

    setLoading(true); setError('');
    try {
      const [photo_url, kitchen_photo_url, payment_qr_url] = await Promise.all([
        files.photo ? uploadViaServer(files.photo, 'chef-photos') : Promise.resolve(''),
        files.kitchen_photo ? uploadViaServer(files.kitchen_photo, 'kitchen-photos') : Promise.resolve(''),
        files.payment_qr ? uploadViaServer(files.payment_qr, 'payment-qr') : Promise.resolve(''),
      ]);

      const payload = {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        photo_url, kitchen_photo_url, payment_qr_url,
      };

      const res = await fetch('/api/chefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FDF6E3' }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md w-full border border-amber-100">
        <div className="text-6xl mb-4">🎊</div>
        <h2 className="font-display text-2xl font-bold text-spice-700 mb-3">Registration Submitted!</h2>
        <p className="text-stone-600 mb-4">Our team will review your profile and send you an email once you're approved — usually within 24 hours.</p>
        <Link href="/" className="inline-block bg-spice-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-spice-600 transition">
          Back to Home
        </Link>
      </div>
    </div>
  );

  const inputCls = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400 bg-white transition";
  const labelCls = "block text-sm font-semibold text-stone-700 mb-1";

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#FDF6E3' }}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-display font-bold text-spice-600">🏠 Ghar.food</Link>
          <h1 className="font-display text-3xl font-bold text-stone-800 mt-3">Become a Home Chef</h1>
          <p className="text-stone-500 text-sm mt-1">Share your cooking with your neighbourhood</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-2 rounded-full transition-colors duration-300 ${step >= s ? 'bg-spice-500' : 'bg-stone-200'}`} />
          ))}
        </div>
        <p className="text-xs text-stone-400 text-center -mt-6 mb-6">Step {step} of 3</p>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 space-y-4">

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                <h2 className="font-display text-xl font-semibold text-stone-800">Personal Details</h2>
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input className={inputCls} placeholder="Sunita Sharma" value={form.name}
                    onChange={e => update('name', e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input type="email" className={inputCls} placeholder="sunita@email.com" value={form.email}
                      onChange={e => update('email', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelCls}>Phone *</label>
                    <input type="tel" className={inputCls} placeholder="+91 98765 43210" value={form.phone}
                      onChange={e => update('phone', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelCls}>Password *</label>
                    <input type="password" className={inputCls} placeholder="Min. 6 characters" value={form.password}
                      onChange={e => update('password', e.target.value)} required minLength={6} />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password *</label>
                    <input type="password" className={inputCls} placeholder="Repeat password" value={form.password2}
                      onChange={e => update('password2', e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                <h2 className="font-display text-xl font-semibold text-stone-800">Kitchen & Location</h2>

                <div>
                  <label className={labelCls}>
                    Full Address *{' '}
                    <span className="font-normal text-stone-400">(building, street, city, pincode)</span>
                  </label>
                  <textarea
                    className={inputCls} rows={3}
                   placeholder="12 Gandhi Road, Bandra West, Mumbai 400050"
                    value={form.address}
                    onChange={e => {
                      update('address', e.target.value);
                      // Reset pin if address changes
                      if (form.lat || form.lng) setForm(p => ({ ...p, lat: null, lng: null }));
                    }}
                    onBlur={handleAddressBlur}
                    required
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    📍 Map will appear after you fill in your address
                  </p>
                </div>

                {/* Map — appears once an address is entered */}
                {showMap && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-stone-700">
                        📍 Confirm your exact location
                      </label>
                      {form.lat && form.lng && (
                        <span className="text-xs text-green-600 font-medium">✅ Pin placed</span>
                      )}
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
                      <MapPicker lat={form.lat} lng={form.lng} address={form.address} onChange={handlePinChange} />
                    </div>
                    {form.lat && form.lng && (
                      <p className="text-xs text-stone-400 text-center">
                        {form.lat.toFixed(5)}, {form.lng.toFixed(5)} — drag the pin if it's off
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className={labelCls}>Place of Origin <span className="font-normal text-stone-400">(optional)</span></label>
                  <input className={inputCls} placeholder="Lucknow, Uttar Pradesh" value={form.place_of_origin}
                    onChange={e => update('place_of_origin', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>What do you cook? *</label>
                  <input className={inputCls} placeholder="Biryani, Dal Makhani, South Indian Thali…" value={form.recipe_list}
                    onChange={e => update('recipe_list', e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>About your cooking <span className="font-normal text-stone-400">(bio)</span></label>
                  <textarea className={inputCls} rows={2}
                    placeholder="I learned cooking from my grandmother and love making authentic home meals…"
                    value={form.bio} onChange={e => update('bio', e.target.value)} />
                </div>
              </>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <>
                <h2 className="font-display text-xl font-semibold text-stone-800">Photos & Payment</h2>
                {[
                  { key: 'photo', label: 'Your Profile Photo *', hint: 'A clear photo of your face', required: true },
                  { key: 'kitchen_photo', label: 'Kitchen Photo', hint: 'Show your cooking space', required: false },
                  { key: 'payment_qr', label: 'UPI / Payment QR Code *', hint: 'Screenshot of your UPI QR from PhonePe / GPay / Paytm', required: true },
                ].map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <p className="text-xs text-stone-400 mb-2">{hint}</p>
                    <label className="flex items-center gap-3 border-2 border-dashed border-stone-200 rounded-xl p-4 cursor-pointer hover:border-spice-400 transition">
                      {previews[key]
                        ? <img src={previews[key]} alt="preview" className="h-16 w-16 object-cover rounded-lg flex-shrink-0" />
                        : <div className="h-16 w-16 bg-stone-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📷</div>}
                      <div>
                        <p className="text-sm font-semibold text-stone-700">{previews[key] ? 'Change photo' : 'Tap to upload'}</p>
                        <p className="text-xs text-stone-400">JPG, PNG – max 5 MB</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => handleFile(key, e.target.files[0])} />
                    </label>
                  </div>
                ))}
                <div>
                  <label className={labelCls}>UPI Phone Number * <span className="font-normal text-stone-400">(customers will pay here)</span></label>
                  <input className={inputCls} placeholder="98765 43210" value={form.payment_phone}
                    onChange={e => update('payment_phone', e.target.value)} required />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="flex-1 border border-stone-200 text-stone-600 font-semibold py-3 rounded-xl hover:bg-stone-50 transition">
                  ← Back
                </button>
              )}
              {step === 1 && (
                <button type="button" onClick={() => { setError(''); setStep(2); }}
                  className="flex-1 bg-spice-500 text-white font-semibold py-3 rounded-xl hover:bg-spice-600 transition">
                  Continue →
                </button>
              )}
              {step === 2 && (
                <button type="button" onClick={handleStep2Continue}
                  className="flex-1 bg-spice-500 disabled:bg-spice-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl hover:bg-spice-600 transition">
                  {form.lat && form.lng ? '✅ Confirm Location & Continue →' : 'Continue →'}
                </button>
              )}
              {step === 3 && (
                <button type="submit" disabled={loading}
                  className="flex-1 bg-spice-500 disabled:bg-spice-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl hover:bg-spice-600 transition">
                  {loading ? '⏳ Submitting…' : 'Submit for Approval 🚀'}
                </button>
              )}
            </div>
          </div>
        </form>

        <p className="text-center text-sm text-stone-400 mt-6">
          Already a chef? <Link href="/chef/login" className="text-spice-600 font-semibold">Log in →</Link>
        </p>
      </div>
    </div>
  );
}