import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('chefs')
    .select('id,name,email,phone,address,place_of_origin,recipe_list,bio,photo_url,kitchen_photo_url,payment_qr_url,payment_phone,lat,lng,status')
    .eq('id', session.id)
    .single();

  if (error) return NextResponse.json({ error: 'Chef not found' }, { status: 404 });
  return NextResponse.json({ chef: data });
}
