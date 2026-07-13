import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public endpoint — anyone can view a chef's kitchen posts
export async function GET(request, { params }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const menuId = searchParams.get('menu_id');

  const supabase = createServerSupabase();

  let query = supabase
    .from('kitchen_posts')
    .select('id, media_url, media_type, caption, menu_id, created_at')
    .eq('chef_id', id)
    .order('created_at', { ascending: false });

  if (menuId) query = query.eq('menu_id', menuId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { posts: data || [] },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    }
  );
}