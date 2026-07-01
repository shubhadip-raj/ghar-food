import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getISTHour() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  return parseInt(s);
}
function getISTDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// GET menus
export async function GET(request) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const date = searchParams.get('date') || getISTDateString();

  if (mine) {
    const session = await getSession();
    if (!session || session.role !== 'chef')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data } = await supabase.from('menus').select('*')
      .eq('chef_id', session.id)
      .gte('date', date)
      .order('created_at', { ascending: false });
    return NextResponse.json({ menus: data || [] });
  }

  // Visitor view — apply time-based visibility filter
  const hour = getISTHour();
  const { data } = await supabase.from('menus')
    .select('*, chefs(name,phone,payment_phone,payment_qr_url)')
    .eq('date', date)
    .eq('is_available', true);

  // FIX 3: Lunch hides at noon (12), dinner hides at midnight
  const filtered = (data || []).filter(m => {
    if (m.meal_type === 'lunch')  return hour < 12;   // hide after noon
    if (m.meal_type === 'dinner') return true;          // visible all day until midnight reset
    return true;
  });

  return NextResponse.json({ menus: filtered });
}

// POST — create menu (time-gated)
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, price, description, meal_type, photo_url } = await request.json();
  if (!name || !price || !meal_type)
    return NextResponse.json({ error: 'Name, price and meal_type required' }, { status: 400 });

  const hour = getISTHour();

  // Lunch window = midnight(0) → 10AM; Dinner window = 10AM → 6PM
  if (meal_type === 'lunch'  && !(hour >= 0  && hour < 10))
    return NextResponse.json({ error: 'Lunch menu can only be posted from 12:00 midnight to 10:00 AM IST' }, { status: 403 });
  if (meal_type === 'dinner' && !(hour >= 10 && hour < 18))
    return NextResponse.json({ error: 'Dinner menu can only be posted from 10:00 AM to 6:00 PM IST' }, { status: 403 });

  const supabase = createServerSupabase();
  const { data: chef } = await supabase.from('chefs').select('status').eq('id', session.id).single();
  if (chef?.status !== 'approved')
    return NextResponse.json({ error: 'Your profile is not yet approved' }, { status: 403 });

  const today = getISTDateString();
  const { data: existing } = await supabase.from('menus')
    .select('id').eq('chef_id', session.id).eq('date', today).eq('meal_type', meal_type).single();
  if (existing)
    return NextResponse.json({ error: `You already posted a ${meal_type} menu today.` }, { status: 400 });

  const { data, error } = await supabase.from('menus').insert({
    chef_id: session.id, name, price: parseFloat(price), description,
    meal_type, photo_url, date: today, is_available: true, orders_count: 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ menu: data }, { status: 201 });
}