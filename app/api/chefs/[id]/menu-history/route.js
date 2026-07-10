import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = params;
  const supabase = createServerSupabase();

  // Calculate date range — last 10 days excluding today (IST)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const from  = new Date();
  from.setDate(from.getDate() - 10);
  const fromDate = from.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const { data: menus, error } = await supabase
    .from('menus')
    .select(`
      id, chef_id, name, description, price,
      meal_type, photo_url, orders_count, is_available, date, created_at
    `)
    .eq('chef_id', id)
    .lt('date', today)       // exclude today
    .gte('date', fromDate)   // last 10 days only
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!menus || menus.length === 0) return NextResponse.json({ menus: [] });

  // Fetch orders for these menus
  const menuIds = menus.map(m => m.id);
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id, menu_id, chef_id, customer_name,
      customer_email, customer_phone, amount, status, created_at
    `)
    .in('menu_id', menuIds)
    .order('created_at', { ascending: false });

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  // Attach orders to each menu
  const menusWithOrders = menus.map(menu => ({
    ...menu,
    orders: (orders || []).filter(o => o.menu_id === menu.id),
  }));

  return NextResponse.json({ menus: menusWithOrders });
}