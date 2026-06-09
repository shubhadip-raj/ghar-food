import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request, { params }) {
  const session = await getSession();
  const supabase = createServerSupabase();
  const id = params.id === 'me' ? session?.id : params.id;
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase.from('chefs')
    .select('id,name,email,phone,address,place_of_origin,recipe_list,bio,photo_url,kitchen_photo_url,payment_qr_url,payment_phone,lat,lng,status')
    .eq('id', id).single();

  if (error) return NextResponse.json({ error: 'Chef not found' }, { status: 404 });
  return NextResponse.json({ chef: data });
}
