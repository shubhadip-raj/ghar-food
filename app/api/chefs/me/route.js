import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('chefs')
    .select('id,name,email,phone,address,place_of_origin,recipe_list,bio,photo_url,kitchen_photo_url,payment_qr_url,payment_phone,lat,lng,status,fssai_number,fssai_certificate_url')
    .eq('id', session.id)
    .single();

  if (error) return NextResponse.json({ error: 'Chef not found' }, { status: 404 });
  return NextResponse.json({ chef: data });
}

export async function PATCH(request) {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Only allow updating these fields
  const allowed = ['fssai_number', 'fssai_certificate_url'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('chefs')
    .update(updates)
    .eq('id', session.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chef: data });
}