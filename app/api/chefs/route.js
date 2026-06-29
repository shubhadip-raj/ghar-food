import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Geocode address via Nominatim (free, no key needed)
// Returns { lat, lng } or null — never silently falls back to Mumbai
async function geocodeAddress(address) {
  const strategies = [
    address, // full address
  ];

  // Pincode-only (very accurate in India)
  const pincodeMatch = address.match(/\b(\d{6})\b/);
  if (pincodeMatch) strategies.push(pincodeMatch[1]);

  // Last 3 parts
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 3) strategies.push(parts.slice(-3).join(', '));
  if (parts.length > 2) strategies.push(parts.slice(-2).join(', '));
  if (parts.length > 0) strategies.push(parts[parts.length - 1]);

  for (const query of strategies) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Ghar.food/1.0', 'Accept-Language': 'en' },
      });
      const data = await res.json();
      if (data && data[0]) {
        console.log(`[Geocode] Matched with query: "${query}" → lat=${data[0].lat}, lng=${data[0].lon}`);
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.error('[Geocode] Fetch error:', err);
    }
  }

  console.warn('[Geocode] All strategies failed for address:', address);
  return null; // Caller must handle null — no silent Mumbai fallback
}

// GET - list all approved chefs (for map)
export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('chefs')
    .select('id,name,phone,photo_url,kitchen_photo_url,lat,lng,recipe_list,place_of_origin,payment_phone,payment_qr_url,bio')
    .eq('status', 'approved');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chefs: data });
}

// POST - register new chef
export async function POST(request) {
  const body = await request.json();
  const {
    name, email, phone, password, address, place_of_origin,
    recipe_list, bio, payment_phone, photo_url, kitchen_photo_url, payment_qr_url,
  } = body;

  if (!name || !email || !phone || !password || !address)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const supabase = createServerSupabase();

  // Check email uniqueness
  const { data: existing } = await supabase.from('chefs').select('id').eq('email', email).single();
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

  const password_hash = await bcrypt.hash(password, 10);

  // Use lat/lng from client if provided (client already geocoded)
  let lat = body.lat ? Number(body.lat) : null;
  let lng = body.lng ? Number(body.lng) : null;

  // Validate — if client lat/lng are suspiciously default Mumbai values,
  // try geocoding again server-side
  const isMumbaiDefault = (
    lat && lng &&
    Math.abs(lat - 19.076) < 0.001 &&
    Math.abs(lng - 72.877) < 0.001
  );

  if (!lat || !lng || isNaN(lat) || isNaN(lng) || isMumbaiDefault) {
    console.log('[Register] No valid coords from client, geocoding server-side...');
    const coords = await geocodeAddress(address);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    } else {
      // Return error instead of silently using Mumbai
      return NextResponse.json(
        { error: 'Could not determine your location from the address. Please include your city and pincode.' },
        { status: 400 }
      );
    }
  }

  console.log(`[Register] Final coords for ${name}: lat=${lat}, lng=${lng}`);

  const { data, error } = await supabase.from('chefs').insert({
    name, email, phone, password_hash, address, place_of_origin,
    recipe_list, bio, payment_phone, photo_url, kitchen_photo_url, payment_qr_url,
    lat, lng, status: 'pending',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chef: data }, { status: 201 });
}
