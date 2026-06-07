import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabase } from '@/lib/supabase';

// Geocode address via Nominatim (free, no key needed)
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Ghar.food/1.0' } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return { lat: 19.076, lng: 72.877 }; // fallback: Mumbai
}

// GET - list all approved chefs (for map)
export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('chefs')
    .select('id,name,photo_url,kitchen_photo_url,lat,lng,recipe_list,place_of_origin,payment_phone,payment_qr_url,bio')
    .eq('status', 'approved');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chefs: data });
}

// POST - register new chef
export async function POST(request) {
  const body = await request.json();
  const { name, email, phone, password, address, place_of_origin,
          recipe_list, bio, payment_phone, photo_url, kitchen_photo_url, payment_qr_url } = body;

  if (!name || !email || !phone || !password || !address)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const supabase = createServerSupabase();

  // Check email uniqueness
  const { data: existing } = await supabase.from('chefs').select('id').eq('email', email).single();
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

  const password_hash = await bcrypt.hash(password, 10);
  const { lat, lng } = await geocodeAddress(address);

  const { data, error } = await supabase.from('chefs').insert({
    name, email, phone, password_hash, address, place_of_origin,
    recipe_list, bio, payment_phone, photo_url, kitchen_photo_url, payment_qr_url,
    lat, lng, status: 'pending',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chef: data }, { status: 201 });
}
