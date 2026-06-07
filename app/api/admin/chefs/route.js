import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { sendChefApprovalEmail, sendChefRejectionEmail } from '@/lib/email';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerSupabase();
  const { data } = await supabase.from('chefs')
    .select('id,name,email,phone,address,place_of_origin,recipe_list,photo_url,kitchen_photo_url,payment_qr_url,payment_phone,status,created_at')
    .order('created_at', { ascending: false });
  return NextResponse.json({ chefs: data || [] });
}

export async function PATCH(request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, status, reason } = await request.json();
  const supabase = createServerSupabase();

  const { data: chef } = await supabase.from('chefs').select('*').eq('id', id).single();
  if (!chef) return NextResponse.json({ error: 'Chef not found' }, { status: 404 });

  await supabase.from('chefs').update({ status }).eq('id', id);

  // Send emails (non-blocking)
  if (status === 'approved') sendChefApprovalEmail({ chef }).catch(console.error);
  if (status === 'rejected') sendChefRejectionEmail({ chef, reason }).catch(console.error);

  return NextResponse.json({ ok: true });
}
