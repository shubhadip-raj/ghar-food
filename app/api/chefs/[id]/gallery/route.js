import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Public endpoint — anyone can view a chef's gallery
export async function GET(request, { params }) {
  const { id } = params;
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('chef_gallery')
    .select('id, photo_url, created_at')
    .eq('chef_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data || [] });
}