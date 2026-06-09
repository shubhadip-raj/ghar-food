'use client';
import { useState, useEffect } from 'react';

const COOKIE_NAME = 'ghar_city';
const COOKIE_DAYS = 30;

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

const POPULAR_CITIES = [
  'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Kochi',
];

export default function CitySelector({ onCitySelected }) {
  const [show, setShow]     = useState(false);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME);
    if (saved) {
      // Already have a city — restore and notify parent
      try {
        const parsed = JSON.parse(saved);
        onCitySelected(parsed);
      } catch {
        setShow(true); // corrupted cookie — ask again
      }
    } else {
      setShow(true); // first visit
    }
  }, []);

  async function selectCity(cityName) {
    setLoading(true); setError('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ', India')}&format=json&limit=1`;
      const res  = await fetch(url, { headers: { 'User-Agent': 'Ghar.food/1.0' } });
      const data = await res.json();
      if (!data[0]) { setError(`"${cityName}" not found. Try another city.`); return; }
      const cityData = {
        name: cityName,
        lat:  parseFloat(data[0].lat),
        lng:  parseFloat(data[0].lon),
      };
      setCookie(COOKIE_NAME, JSON.stringify(cityData), COOKIE_DAYS);
      onCitySelected(cityData);
      setShow(false);
    } catch {
      setError('Could not find city. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim()) selectCity(input.trim());
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
         style={{ background: 'rgba(28,10,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Top */}
        <div className="bg-spice-500 px-6 pt-8 pb-6 text-center">
          <div className="text-5xl mb-2">🏠</div>
          <h1 className="font-display text-2xl font-bold text-white">Ghar.food</h1>
          <p className="text-orange-100 text-sm mt-1">Home-cooked goodness, near you</p>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold text-stone-800">Which city are you in?</h2>
            <p className="text-sm text-stone-400 mt-1">We'll show you home chefs nearby 🍽️</p>
          </div>

          {/* Quick-pick popular cities */}
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_CITIES.map(city => (
              <button key={city} onClick={() => selectCity(city)} disabled={loading}
                className="px-3 py-1.5 text-sm bg-amber-50 hover:bg-spice-50 border border-amber-200 hover:border-spice-300 text-stone-700 rounded-full transition disabled:opacity-50">
                {city}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-stone-300">
            <hr className="flex-1 border-stone-200" />
            <span className="text-xs">or type your city</span>
            <hr className="flex-1 border-stone-200" />
          </div>

          {/* Manual input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. Coimbatore"
              className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spice-400"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="bg-spice-500 hover:bg-spice-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm">
              {loading ? '…' : 'Go →'}
            </button>
          </form>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <p className="text-xs text-stone-400 text-center">
            We remember your city for 30 days 🍪
          </p>
        </div>
      </div>
    </div>
  );
}
