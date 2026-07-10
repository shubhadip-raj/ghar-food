import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET — fetch all posts for logged-in chef, joined with menu name
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('kitchen_posts')
    .select('*, menus(id, name, meal_type)')
    .eq('chef_id', session.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

// POST — create a new post (optionally linked to a menu)
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { media_url, media_type, caption, menu_id } = await request.json();
  if (!media_url || !media_type)
    return NextResponse.json({ error: 'media_url and media_type are required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('kitchen_posts')
    .insert({ chef_id: session.id, media_url, media_type, caption: caption || '', menu_id: menu_id || null })
    .select('*, menus(id, name, meal_type)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201 });
}

// DELETE — remove a post
export async function DELETE(request) {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('kitchen_posts')
    .delete()
    .eq('id', id)
    .eq('chef_id', session.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}