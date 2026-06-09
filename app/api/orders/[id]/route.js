import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

const VALID_STATUSES = ['confirmed', 'payment_received', 'shipped', 'cancelled'];

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session || (session.role !== 'chef' && session.role !== 'admin'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status } = await request.json();
  if (!VALID_STATUSES.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const supabase = createServerSupabase();

  // Chefs can only update their own orders
  const query = supabase.from('orders').update({ status }).eq('id', params.id);
  if (session.role === 'chef') query.eq('chef_id', session.id);

  const { data, error } = await query.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}
