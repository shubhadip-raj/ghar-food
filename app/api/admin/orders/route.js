import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerSupabase();
  const { data } = await supabase.from('orders')
    .select('*, chefs(name), menus(name,meal_type,pickup_time)')
    .order('created_at', { ascending: false });
  return NextResponse.json({ orders: data || [] });
}
