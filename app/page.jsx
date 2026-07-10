import { createServerSupabase } from '@/lib/supabase';
import MapView from '@/components/MapView';
import Link from 'next/link';
import MyOrdersButton from '@/components/MyOrdersButton';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getData() {
  try {
    const supabase = createServerSupabase();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const [{ data: chefs, error }, { data: menus, error: menuError }] = await Promise.all([
      supabase
        .from('chefs')
        .select('id,name,email,phone,address,bio,place_of_origin,recipe_list,photo_url,kitchen_photo_url,payment_qr_url,payment_phone,status,lat,lng,fssai_number,fssai_certificate_url,created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase
        .from('menus')
        .select('id, chef_id, name, description, price, meal_type, photo_url, orders_count, is_available')
        .eq('date', today)
        .eq('is_available', true),
    ]);

    if (error) console.error('Chefs fetch error:', error);
    if (menuError) console.error('Menus fetch error:', menuError);

    const menuChefIds = [...new Set((menus || []).map(m => m.chef_id))];
    const filteredChefs = (chefs || []).filter(chef => menuChefIds.includes(chef.id));

    console.log(`[Home] chefs=${chefs?.length}, menus=${menus?.length}, filtered=${filteredChefs.length}, today=${today}`);

    return { chefs: filteredChefs, menus: menus || [] };
  } catch (err) {
    console.error('[Home] getData error:', err);
    return { chefs: [], menus: [] };
  }
}

export default async function HomePage() {
  const { chefs, menus } = await getData();

  const lunchCount  = menus.filter(m => m.meal_type === 'lunch').length;
  const dinnerCount = menus.filter(m => m.meal_type === 'dinner').length;

  return (
    <div className="flex flex-col h-screen" style={{ background: '#FDF6E3' }}>
      {/* Top Nav */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-amber-100 shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="font-display text-2xl font-bold text-spice-600">
            Ghar<span className="text-stone-800">.food</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Meal counts — desktop only */}
          <div className="hidden sm:flex gap-2 text-sm text-stone-500">
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
              🍱 {lunchCount} lunch{lunchCount !== 1 ? 'es' : ''}
            </span>
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
              🌙 {dinnerCount} dinner{dinnerCount !== 1 ? 's' : ''} today
            </span>
          </div>

          {/* My Orders button — client component */}
          <MyOrdersButton />

          <Link href="/register"
            className="bg-spice-500 hover:bg-spice-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            Become a Chef
          </Link>
          <Link href="/chef/login"
            className="text-spice-600 hover:text-spice-700 text-sm font-semibold px-3 py-2 transition">
            Chef Login
          </Link>
        </div>
      </header>

      {/* Map */}
      <main className="flex-1 relative">
        <MapView chefs={chefs} menus={menus} />

        {/* Floating info card */}
        <div className="absolute bottom-6 left-4 z-[999] bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 max-w-xs border border-amber-100">
          <p className="font-display text-lg font-semibold text-stone-800 leading-tight">
            {chefs.length > 0
              ? `${chefs.length} home chef${chefs.length !== 1 ? 's' : ''} near you 🍽️`
              : 'No chefs yet – be the first! 🍳'}
          </p>
          <p className="text-xs text-stone-500 mt-1">Click a 🏠 on the map to see today's menu &amp; order</p>
        </div>
      </main>
    </div>
  );
}