import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabase } from '@/lib/supabase';
import { createToken, setSessionCookie, getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (session?.role === 'chef') return NextResponse.json({ ok: true });
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}

export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password)
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: chef } = await supabase.from('chefs').select('*').eq('email', email).single();

  if (!chef || !(await bcrypt.compare(password, chef.password_hash)))
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

  const token = await createToken({ id: chef.id, role: 'chef', email: chef.email });
  const response = NextResponse.json({ ok: true, chef: { id: chef.id, name: chef.name, status: chef.status } });
  setSessionCookie(response, token);
  return response;
}
