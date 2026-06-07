import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { sendOrderConfirmation } from '@/lib/email';

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  if (session.role === 'chef') {
    const { data } = await supabase.from('orders')
      .select('*, menus(name,meal_type,price)')
      .eq('chef_id', session.id)
      .order('created_at', { ascending: false });
    return NextResponse.json({ orders: data || [] });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request) {
  const { menu_id, chef_id, name: customer_name, email: customer_email, phone: customer_phone } = await request.json();

  if (!menu_id || !chef_id || !customer_name || !customer_email || !customer_phone)
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });

  const supabase = createServerSupabase();

  // Get menu to check availability and price
  const { data: menu } = await supabase.from('menus').select('*').eq('id', menu_id).single();
  if (!menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
  if (!menu.is_available) return NextResponse.json({ error: 'This menu is no longer available' }, { status: 400 });
  if (menu.orders_count >= 10) return NextResponse.json({ error: 'This meal is fully booked' }, { status: 400 });

  // Get chef for email
  const { data: chef } = await supabase.from('chefs')
    .select('name, email, phone, payment_phone, payment_qr_url').eq('id', chef_id).single();
  if (!chef) return NextResponse.json({ error: 'Chef not found' }, { status: 404 });

  // Create order
  const { data: order, error } = await supabase.from('orders').insert({
    menu_id, chef_id, customer_name, customer_email, customer_phone,
    amount: menu.price, status: 'confirmed',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment order count
  await supabase.from('menus').update({ orders_count: (menu.orders_count || 0) + 1 }).eq('id', menu_id);

  // If 10 orders reached, mark as unavailable
  if ((menu.orders_count || 0) + 1 >= 10) {
    await supabase.from('menus').update({ is_available: false }).eq('id', menu_id);
  }

  // Send confirmation email (non-blocking)
  sendOrderConfirmation({
    customer: { name: customer_name, email: customer_email },
    order, chef, menu,
  }).catch(console.error);

  return NextResponse.json({ order }, { status: 201 });
}
