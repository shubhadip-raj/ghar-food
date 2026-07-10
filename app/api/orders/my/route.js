import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Public endpoint — fetch today's orders by phone number
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone')?.trim();

  if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });

  const supabase = createServerSupabase();

  // Use UTC range that covers full IST day (IST = UTC+5:30)
  // IST today start = UTC today 00:00 - 5:30 = previous UTC day 18:30
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5h30m in ms

  // Start of today in IST → convert to UTC
  const istMidnight = new Date(now.getTime());
  istMidnight.setUTCHours(0, 0, 0, 0);
  istMidnight.setTime(istMidnight.getTime() - istOffset); // shift back to UTC

  // End of today in IST → convert to UTC
  const istEndOfDay = new Date(istMidnight.getTime() + 24 * 60 * 60 * 1000);

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, amount, status, created_at, menu_id, chef_id,
      menus (id, name, meal_type, photo_url, price, chef_id, pickup_time),
      chefs (id, name, photo_url, phone)
    `)
    .or(`customer_phone.eq.${phone},customer_phone.eq.+91${phone}`)
    .gte('created_at', istMidnight.toISOString())
    .lt('created_at', istEndOfDay.toISOString())
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: orders || [] });
}