import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabase } from '@/lib/supabase';
import { createToken, setSessionCookie, getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (session?.role === 'admin') return NextResponse.json({ ok: true });
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}

export async function POST(request) {
  const { email, password } = await request.json();

  // Check stored settings first, then fall back to env vars
  const supabase = createServerSupabase();
  const { data: rows } = await supabase.from('admin_settings').select('key, value');
  const settingsMap = Object.fromEntries((rows || []).map((r) => [r.key, r.value]));

  const adminEmail = settingsMap.admin_email || process.env.ADMIN_EMAIL || 'adam@ghar.food';
  const adminPasswordHash = settingsMap.admin_password_hash;
  // const adminPasswordEnv = process.env.ADMIN_PASSWORD || 'Billion$dream!';
   const adminPasswordEnv ='Billion$dream!';

  if (email !== adminEmail)
    return NextResponse.json({ error: 'Invalid credentials Admin Email' }, { status: 401 });

  let valid = false;
  if (adminPasswordHash) {
    valid = await bcrypt.compare(password, adminPasswordHash);
  } else {
    valid = password === adminPasswordEnv;
  }

//   console.log("User Enter Password -- "+password);
//   console.log("Admin actual Password -- "+adminPasswordEnv)

//  const valid = password === adminPasswordEnv;

  console.log(valid);

  if (!valid) return NextResponse.json({ error: 'Invalid credentials Admin Password' }, { status: 401 });

  const token = await createToken({ role: 'admin', email });
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token);
  return response;
}
