'use client';
import { useState } from 'react';
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

// Geocode an address string → { lat, lng } using free Nominatim API
// Tries multiple fallback strategies for long/complex Indian addresses
async function geocodeAddress(address) {
  const nominatimFetch = async (query) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'GharFood/1.0' },
    });
    const data = await res.json();
    return data && data.length > 0
      ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), matchedQuery: query }
      : null;
  };

  // Strategy 1: Try full address as-is
  console.log('📍 [Geocode] Strategy 1 — full address:', address);
  let result = await nominatimFetch(address);
  if (result) { console.log('✅ [Geocode] Strategy 1 succeeded:', result); return result; }

  // Strategy 2: Extract pincode + city (most reliable for India)
  // e.g. "600095 Chennai" 
  const pincodeMatch = address.match(/\b(\d{6})\b/);
  const cityMatch = address.match(/,\s*([^,]+),\s*Tamil Nadu|,\s*([^,]+),\s*Maharashtra|,\s*([^,]+),\s*Karnataka|,\s*([^,]+),\s*Delhi|,\s*([^,]+),\s*([A-Z][a-z]+ Pradesh)/);
  if (pincodeMatch) {
    const pinQuery = pincodeMatch[1]; // just the pincode — very accurate in India
    console.log('📍 [Geocode] Strategy 2 — pincode only:', pinQuery);
    result = await nominatimFetch(pinQuery);
    if (result) { console.log('✅ [Geocode] Strategy 2 succeeded:', result); return result; }
  }

  // Strategy 3: Take last 3 comma-separated parts (neighbourhood, city, state)
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 3) {
    const trimmed = parts.slice(-3).join(', ');
    console.log('📍 [Geocode] Strategy 3 — last 3 parts:', trimmed);
    result = await nominatimFetch(trimmed);
    if (result) { console.log('✅ [Geocode] Strategy 3 succeeded:', result); return result; }
  }

  // Strategy 4: Take last 2 comma-separated parts (city, state)
  if (parts.length > 2) {
    const trimmed = parts.slice(-2).join(', ');
    console.log('📍 [Geocode] Strategy 4 — last 2 parts (city + state):', trimmed);
    result = await nominatimFetch(trimmed);
    if (result) { console.log('✅ [Geocode] Strategy 4 succeeded:', result); return result; }
  }

  // Strategy 5: Just the last part (city or state)
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    console.log('📍 [Geocode] Strategy 5 — last part only:', lastPart);
    result = await nominatimFetch(lastPart);
    if (result) { console.log('✅ [Geocode] Strategy 5 succeeded:', result); return result; }
  }

  console.error('❌ [Geocode] All strategies failed for address:', address);
  return null;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [geocodeStatus, setGeocodeStatus] = useState(''); // 'loading' | 'success' | 'failed' | ''
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password2: '',
    address: '', place_of_origin: '', recipe_list: '', bio: '',
    payment_phone: '',
    lat: null,
    lng: null,
  });
  const [files, setFiles] = useState({ photo: null, kitchen_photo: null, payment_qr: null });
  const [previews, setPreviews] = useState({});

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleFile = (field, file) => {
    if (!file) return;
    setFiles((p) => ({ ...p, [field]: file }));
    setPreviews((p) => ({ ...p, [field]: URL.createObjectURL(file) }));
  };

  // Called when user leaves the address field
  const handleAddressBlur = async () => {
    if (!form.address.trim()) return;
    setGeocodeStatus('loading');
    try {
      const coords = await geocodeAddress(form.address);
      if (coords) {
        setForm((p) => ({ ...p, lat: coords.lat, lng: coords.lng }));
        setGeocodeStatus('success');
        console.log('📍 Geocoded address to:', coords);
      } else {
        setGeocodeStatus('failed');
        console.warn('⚠️ Could not geocode address:', form.address);
      }
    } catch (err) {
      setGeocodeStatus('failed');
      console.error('❌ Geocode error:', err);
    }
  };

  // Step 2 → Step 3 requires a valid geocode
  const handleStep2Continue = async () => {
    setError('');
    if (!form.address.trim()) { setError('Please enter your address'); return; }

    // If geocode not done yet (user never blurred), run it now
    if (!form.lat || !form.lng) {
      setGeocodeStatus('loading');
      const coords = await geocodeAddress(form.address);
      if (coords) {
        setForm((p) => ({ ...p, lat: coords.lat, lng: coords.lng }));
        setGeocodeStatus('success');
      } else {
        setGeocodeStatus('failed');
        setError('Could not find your address on the map. Please make sure it includes your city and pincode.');
        return;
      }
    }

    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!files.photo) { setError('Please upload a profile photo'); return; }
    if (!files.payment_qr) { setError('Please upload your UPI QR code'); return; }
    if (!form.lat || !form.lng) { setError('Address could not be geocoded. Please go back and fix your address.'); return; }

    setLoading(true);
    setError('');
    try {
      const [photo_url, kitchen_photo_url, payment_qr_url] = await Promise.all([
        files.photo ? uploadViaServer(files.photo, 'chef-photos') : Promise.resolve(''),
        files.kitchen_photo ? uploadViaServer(files.kitchen_photo, 'kitchen-photos') : Promise.resolve(''),
        files.payment_qr ? uploadViaServer(files.payment_qr, 'payment-qr') : Promise.resolve(''),
      ]);

      // const res = await fetch('/api/chefs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...form, photo_url, kitchen_photo_url, payment_qr_url }),
      // });


    const payload = {
      ...form,
      lat: Number(form.lat),   // ✅ force number
      lng: Number(form.lng),   // ✅ force number
      photo_url,
      kitchen_photo_url,
      payment_qr_url,
    };

    console.log("🚀 FINAL PAYLOAD:", payload); // DEBUG

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
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-display font-bold text-spice-600">🏠 Ghar.food</Link>
          <h1 className="font-display text-3xl font-bold text-stone-800 mt-3">Become a Home Chef</h1>
          <p className="text-stone-500 text-sm mt-1">Share your cooking with your neighbourhood</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-2 rounded-full transition-colors duration-300 ${step >= s ? 'bg-spice-500' : 'bg-stone-200'}`} />
          ))}
        </div>
        <p className="text-xs text-stone-400 text-center -mt-6 mb-6">Step {step} of 3</p>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 space-y-4">

            {/* ── STEP 1: Personal ── */}
            {step === 1 && (
              <>
                <h2 className="font-display text-xl font-semibold text-stone-800">Personal Details</h2>
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input className={inputCls} placeholder="Sunita Sharma" value={form.name}
                    onChange={(e) => update('name', e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input type="email" className={inputCls} placeholder="sunita@email.com" value={form.email}
                      onChange={(e) => update('email', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelCls}>Phone *</label>
                    <input type="tel" className={inputCls} placeholder="+91 98765 43210" value={form.phone}
                      onChange={(e) => update('phone', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelCls}>Password *</label>
                    <input type="password" className={inputCls} placeholder="Min. 6 characters" value={form.password}
                      onChange={(e) => update('password', e.target.value)} required minLength={6} />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password *</label>
                    <input type="password" className={inputCls} placeholder="Repeat password" value={form.password2}
                      onChange={(e) => update('password2', e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Location & Cooking ── */}
            {step === 2 && (
              <>
                <h2 className="font-display text-xl font-semibold text-stone-800">Kitchen & Location</h2>
                <div>
                  <label className={labelCls}>
                    Full Address *{' '}
                    <span className="font-normal text-stone-400">(used to pin you on the map)</span>
                  </label>
                  <textarea
                    className={inputCls}
                    rows={3}
                    placeholder="12 Gandhi Road, Bandra West, Mumbai 400050"
                    value={form.address}
                    onChange={(e) => {
                      update('address', e.target.value);
                      // Reset geocode if they change address after geocoding
                      if (form.lat || form.lng) {
                        setForm((p) => ({ ...p, lat: null, lng: null }));
                        setGeocodeStatus('');
                      }
                    }}
                    onBlur={handleAddressBlur}
                    required
                  />

                  {/* Geocode status indicator */}
                  {geocodeStatus === 'loading' && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span className="animate-spin inline-block">⏳</span> Finding your location on the map…
                    </p>
                  )}
                  {geocodeStatus === 'success' && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Location found! ({form.lat?.toFixed(4)}, {form.lng?.toFixed(4)})
                    </p>
                  )}
                  {geocodeStatus === 'failed' && (
                    <p className="text-xs text-red-500 mt-1">
                      ❌ Could not find this address. Try adding your city and pincode.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Place of Origin <span className="font-normal text-stone-400">(optional)</span></label>
                  <input className={inputCls} placeholder="Lucknow, Uttar Pradesh" value={form.place_of_origin}
                    onChange={(e) => update('place_of_origin', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>What do you cook? *</label>
                  <input className={inputCls} placeholder="Biryani, Dal Makhani, South Indian Thali…" value={form.recipe_list}
                    onChange={(e) => update('recipe_list', e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>About your cooking <span className="font-normal text-stone-400">(bio)</span></label>
                  <textarea className={inputCls} rows={2}
                    placeholder="I learned cooking from my grandmother and love making authentic home meals…"
                    value={form.bio} onChange={(e) => update('bio', e.target.value)} />
                </div>
              </>
            )}

            {/* ── STEP 3: Photos & Payment ── */}
            {step === 3 && (
              <>
                <h2 className="font-display text-xl font-semibold text-stone-800">Photos & Payment</h2>
                {[
                  { key: 'photo', label: 'Your Profile Photo *', hint: 'A clear photo of your face', required: true },
                  { key: 'kitchen_photo', label: 'Kitchen Photo', hint: 'Show your cooking space', required: false },
                  { key: 'payment_qr', label: 'UPI / Payment QR Code *', hint: 'Screenshot of your UPI QR code from PhonePe / GPay / Paytm', required: true },
                ].map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <p className="text-xs text-stone-400 mb-2">{hint}</p>
                    <label className="flex items-center gap-3 border-2 border-dashed border-stone-200 rounded-xl p-4 cursor-pointer hover:border-spice-400 transition">
                      {previews[key]
                        ? <img src={previews[key]} alt="preview" className="h-16 w-16 object-cover rounded-lg flex-shrink-0" />
                        : <div className="h-16 w-16 bg-stone-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📷</div>
                      }
                      <div>
                        <p className="text-sm font-semibold text-stone-700">{previews[key] ? 'Change photo' : 'Tap to upload'}</p>
                        <p className="text-xs text-stone-400">JPG, PNG – max 5 MB</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleFile(key, e.target.files[0])} />
                    </label>
                  </div>
                ))}
                <div>
                  <label className={labelCls}>UPI Phone Number * <span className="font-normal text-stone-400">(customers will pay here)</span></label>
                  <input className={inputCls} placeholder="98765 43210" value={form.payment_phone}
                    onChange={(e) => update('payment_phone', e.target.value)} required />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            {/* Navigation buttons */}
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
                <button type="button" onClick={handleStep2Continue} disabled={geocodeStatus === 'loading'}
                  className="flex-1 bg-spice-500 disabled:bg-spice-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl hover:bg-spice-600 transition">
                  {geocodeStatus === 'loading' ? '⏳ Finding location…' : 'Continue →'}
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
