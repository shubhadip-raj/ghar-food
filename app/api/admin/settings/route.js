import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerSupabase();
  const { data } = await supabase.from('admin_settings').select('key, value');
  const settings = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  // Mask sensitive values
  if (settings.resend_api_key) settings.resend_api_key = settings.resend_api_key.slice(0, 6) + '…';
  delete settings.admin_password_hash;
  return NextResponse.json({ settings });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { settings } = await request.json();
  const supabase = createServerSupabase();

  const pairs = [];
  if (settings.admin_email) pairs.push({ key: 'admin_email', value: settings.admin_email });
  if (settings.resend_api_key && !settings.resend_api_key.includes('…'))
    pairs.push({ key: 'resend_api_key', value: settings.resend_api_key });
  if (settings.from_email) pairs.push({ key: 'from_email', value: settings.from_email });
  if (settings.max_orders) pairs.push({ key: 'max_orders', value: settings.max_orders.toString() });
  if (settings.tagline) pairs.push({ key: 'tagline', value: settings.tagline });
  if (settings.new_admin_password) {
    const hash = await bcrypt.hash(settings.new_admin_password, 10);
    pairs.push({ key: 'admin_password_hash', value: hash });
  }

  for (const pair of pairs) {
    await supabase.from('admin_settings').upsert(pair, { onConflict: 'key' });
  }

  return NextResponse.json({ ok: true });
}
