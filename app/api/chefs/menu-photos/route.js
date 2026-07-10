import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET — fetch all unique menu photo URLs for logged-in chef
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'chef')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('menus')
    .select('id, name, photo_url, meal_type, date')
    .eq('chef_id', session.id)
    .not('photo_url', 'is', null)
    .neq('photo_url', '')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate by photo_url — keep most recent
  const seen = new Set();
  const unique = (data || []).filter(m => {
    if (seen.has(m.photo_url)) return false;
    seen.add(m.photo_url);
    return true;
  });

  return NextResponse.json({ photos: unique });
}