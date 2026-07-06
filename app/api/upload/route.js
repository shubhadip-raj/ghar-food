import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

const ALLOWED_BUCKETS = ['chef-photos', 'kitchen-photos', 'payment-qr', 'menu-photos', 'chef-gallery'];

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const bucket = formData.get('bucket');

  if (!file || !bucket) return NextResponse.json({ error: 'file and bucket required' }, { status: 400 });
  if (!ALLOWED_BUCKETS.includes(bucket)) return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createServerSupabase();
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}