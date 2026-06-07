import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

function getISTDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
}

function getISTHour() {
  const ist = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  return parseInt(ist);
}

// GET menus - either all today's (for visitors) or chef's own
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
      .eq('chef_id', session.id).gte('date', date)
      .order('created_at', { ascending: false });
    return NextResponse.json({ menus: data || [] });
  }

  const { data } = await supabase.from('menus').select('*, chefs(name,payment_phone,payment_qr_url)')
    .eq('date', date).eq('is_available', true);
  return NextResponse.json({ menus: data || [] });
}

// POST - create a menu item (chef only, time-gated)
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, price, description, meal_type, photo_url } = await request.json();
  if (!name || !price || !meal_type)
    return NextResponse.json({ error: 'Name, price and meal_type required' }, { status: 400 });

  const hour = getISTHour();
  // Time gates: lunch 8-10, dinner 12-15  (admin bypass: check env)
  if (meal_type === 'lunch' && !(hour >= 8 && hour < 10))
    return NextResponse.json({ error: 'Lunch menu can only be posted 8:00–10:00 AM IST' }, { status: 403 });
  if (meal_type === 'dinner' && !(hour >= 12 && hour < 15))
    return NextResponse.json({ error: 'Dinner menu can only be posted 12:00–3:00 PM IST' }, { status: 403 });

  const supabase = createServerSupabase();

  // Check chef is approved
  const { data: chef } = await supabase.from('chefs').select('status').eq('id', session.id).single();
  if (chef?.status !== 'approved')
    return NextResponse.json({ error: 'Your profile is not yet approved' }, { status: 403 });

  const today = getISTDateString();

  // Check if menu for this meal already exists today
  const { data: existing } = await supabase.from('menus')
    .select('id').eq('chef_id', session.id).eq('date', today).eq('meal_type', meal_type).single();
  if (existing)
    return NextResponse.json({ error: `You already posted a ${meal_type} menu today. Update it instead.` }, { status: 400 });

  const { data, error } = await supabase.from('menus').insert({
    chef_id: session.id, name, price: parseFloat(price), description,
    meal_type, photo_url, date: today, is_available: true, orders_count: 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ menu: data }, { status: 201 });
}
