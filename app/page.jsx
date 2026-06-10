import { createServerSupabase } from '@/lib/supabase';
import MapView from '@/components/MapView';
import Link from 'next/link';

async function getData() {
  try {
    const supabase = createServerSupabase();
    const today = new Date().toISOString().split('T')[0];

    // const { data: chefs } = await supabase
    //   .from('chefs')
    //   .select('id,name,photo_url,lat,lng,recipe_list,place_of_origin,payment_phone,payment_qr_url')
    //   .eq('status', 'approved');

    // const { data: menus } = await supabase
    //   .from('menus')
    //   .select('*')
    //   .eq('date', today)
    //   .eq('is_available', true);

    const { data: chefs, error } = await supabase
      .from('chefs')
      .select('*').eq('status', 'approved');



// change the query scequence
    const { data: menus, error1 } = await supabase
      .from('menus')
      .select('*').eq('date', today)
      .eq('is_available', true);




    return { chefs: chefs || [], menus: menus || [] };
  } catch {
    return { chefs: [], menus: [] };
  }
}

export default async function HomePage() {
  const { chefs, menus } = await getData();

  const lunchCount = menus.filter((m) => m.meal_type === 'lunch').length;
  const dinnerCount = menus.filter((m) => m.meal_type === 'dinner').length;

  return (
    <div className="flex flex-col h-screen" style={{ background: '#FDF6E3' }}>
      {/* Top Nav */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-amber-100 shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="font-display text-2xl font-bold text-spice-600">Ghar<span className="text-stone-800">.food</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-2 text-sm text-stone-500">
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full">🍱 {lunchCount} lunch{lunchCount !== 1 ? 'es' : ''}</span>
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">🌙 {dinnerCount} dinner{dinnerCount !== 1 ? 's' : ''} today</span>
          </div>
          <Link href="/register" className="bg-spice-500 hover:bg-spice-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            Become a Chef
          </Link>
          <Link href="/chef/login" className="text-spice-600 hover:text-spice-700 text-sm font-semibold px-3 py-2 transition">
            Chef Login
          </Link>
        </div>
      </header>

      {/* Map — fills the rest */}
      <main className="flex-1 relative">
        <MapView chefs={chefs} menus={menus} />

        {/* Floating info card — bottom left */}
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
