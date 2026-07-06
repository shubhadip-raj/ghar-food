import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET — fetch all gallery images for logged-in chef
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('chef_gallery')
    .select('*')
    .eq('chef_id', session.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data || [] });
}

// POST — add a new gallery image
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { photo_url } = await request.json();
  if (!photo_url)
    return NextResponse.json({ error: 'photo_url is required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('chef_gallery')
    .insert({ chef_id: session.id, photo_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ image: data }, { status: 201 });
}

// DELETE — remove a gallery image
export async function DELETE(request) {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id)
    return NextResponse.json({ error: 'Image id is required' }, { status: 400 });

  const supabase = createServerSupabase();
  // Make sure chef can only delete their own images
  const { error } = await supabase
    .from('chef_gallery')
    .delete()
    .eq('id', id)
    .eq('chef_id', session.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}