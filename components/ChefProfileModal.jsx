'use client';
import { useEffect, useState } from 'react';

export default function ChefProfileModal({ chef, onClose }) {
    const [tab, setTab] = useState('profile'); // 'profile' | 'history'
    const [gallery, setGallery] = useState([]);
    const [galleryLoading, setGalleryLoading] = useState(true);
    const [lightbox, setLightbox] = useState(null);

    // Menu history state
    const [menus, setMenus] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyFetched, setHistoryFetched] = useState(false);

    // Fetch gallery on mount
    useEffect(() => {
        fetch(`/api/chefs/${chef.id}/gallery`)
            .then(r => r.json())
            .then(d => setGallery(d.images || []))
            .catch(() => setGallery([]))
            .finally(() => setGalleryLoading(false));
    }, [chef.id]);

    // Fetch menu history only when history tab is opened
    useEffect(() => {
        if (tab !== 'history' || historyFetched) return;
        setHistoryLoading(true);
        fetch(`/api/chefs/${chef.id}/menu-history`)
            .then(r => r.json())
            .then(d => setMenus(d.menus || []))
            .catch(() => setMenus([]))
            .finally(() => { setHistoryLoading(false); setHistoryFetched(true); });
    }, [tab, chef.id, historyFetched]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (lightbox) setLightbox(null);
                else onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightbox, onClose]);

    // Group menus by date for history tab
    const menusByDate = menus.reduce((acc, menu) => {
        if (!acc[menu.date]) acc[menu.date] = [];
        acc[menu.date].push(menu);
        return acc;
    }, {});

    const mealEmoji = type => type === 'lunch' ? '🍱' : '🌙';
    const statusColor = s => ({
        confirmed: 'bg-blue-100 text-blue-700',
        payment_received: 'bg-green-100 text-green-700',
        shipped: 'bg-purple-100 text-purple-700',
        cancelled: 'bg-red-100 text-red-500',
    }[s] || 'bg-stone-100 text-stone-500');

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
                onClick={onClose}
            >
                {/* Modal */}
                <div
                    className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    style={{ maxHeight: '92vh' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 px-5 pt-6 pb-4 border-b border-amber-100 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition"
                        >×</button>

                        <div className="flex items-center gap-4 pr-10">
                            <div className="relative flex-shrink-0">
                                <img
                                    src={chef.photo_url || 'https://placehold.co/72x72/f97316/white?text=Chef'}
                                    alt={chef.name}
                                    className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-200"
                                />
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-stone-800">{chef.name}</h2>
                                {chef.place_of_origin && (
                                    <p className="text-sm text-stone-500">📍 From {chef.place_of_origin}</p>
                                )}
                                <a href={`tel:${chef.phone}`}
                                    className="inline-block mt-1 text-sm font-semibold text-orange-600 hover:underline">
                                    📞 {chef.phone}
                                </a>
                                {chef.fssai_number && (
                                    <a
                                        href="https://www.fssai.gov.in/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition"
                                    >
                                        🏅 FSSAI: {chef.fssai_number}
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* ── Tab switcher ── */}
                        <div className="flex gap-2 mt-4">
                            {[['profile', '👤 Profile'], ['history', '📋 Menu History']].map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${tab === key
                                            ? 'bg-spice-500 text-white shadow-sm'
                                            : 'bg-white/70 text-stone-600 border border-stone-200 hover:border-orange-300'
                                        }`}
                                >{label}</button>
                            ))}
                        </div>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="flex-1 overflow-y-auto">

                        {/* ════════ PROFILE TAB ════════ */}
                        {tab === 'profile' && (
                            <>
                                {/* Recipe list */}
                                {chef.recipe_list && (
                                    <div className="p-5">
                                        <div className="rounded-xl bg-white border border-orange-100 p-3 flex gap-2">
                                            <span>🍽️</span>
                                            <p className="text-sm text-stone-600">{chef.recipe_list}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Bio */}
                                {chef.bio && (
                                    <div className="px-5 pb-2">
                                        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span>👨‍🍳</span>
                                                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">About the Chef</p>
                                            </div>
                                            <p className="text-sm leading-7 text-stone-700">{chef.bio}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Kitchen photo */}
                                {chef.kitchen_photo_url && (
                                    <div className="px-5 pt-4">
                                        <h3 className="font-semibold text-stone-800 mb-3">🍳 Kitchen</h3>
                                        <div
                                            className="relative overflow-hidden rounded-2xl shadow-md cursor-pointer group"
                                            onClick={() => setLightbox(chef.kitchen_photo_url)}
                                        >
                                            <img src={chef.kitchen_photo_url} alt="Kitchen"
                                                className="w-full h-56 object-cover transition duration-300 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                                            <div className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 rounded-lg text-xs">🔍 View</div>
                                        </div>
                                    </div>
                                )}

                                {/* Gallery */}
                                <div className="px-5 pt-5 pb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-stone-800">📸 Gallery</h3>
                                        {!galleryLoading && gallery.length > 0 && (
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                                {gallery.length} Photos
                                            </span>
                                        )}
                                    </div>

                                    {galleryLoading ? (
                                        <div className="grid grid-cols-3 gap-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="aspect-square bg-stone-100 rounded-xl animate-pulse" />
                                            ))}
                                        </div>
                                    ) : gallery.length === 0 ? (
                                        <div className="border-2 border-dashed border-orange-200 rounded-2xl py-10 text-center">
                                            <p className="text-3xl mb-2">🖼️</p>
                                            <p className="text-sm text-stone-400">No gallery photos yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                            {gallery.map(img => (
                                                <div key={img.id}
                                                    className="relative group overflow-hidden rounded-xl cursor-pointer"
                                                    onClick={() => setLightbox(img.photo_url)}>
                                                    <img src={img.photo_url} alt="Gallery"
                                                        className="aspect-square w-full object-cover transition duration-300 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                        <span className="text-white text-xl">🔍</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ════════ HISTORY TAB ════════ */}
                        {tab === 'history' && (
                            <div className="p-5 space-y-5">
                                {historyLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : Object.keys(menusByDate).length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-4xl mb-3">📋</p>
                                        <p className="text-stone-400 text-sm">No menu history in the last 10 days.</p>
                                    </div>
                                ) : (
                                    Object.entries(menusByDate).map(([date, dayMenus]) => {
                                        const totalOrders = dayMenus.reduce((s, m) => s + (m.orders?.length || 0), 0);
                                        const totalRevenue = dayMenus.reduce((s, m) =>
                                            s + (m.orders || []).reduce((os, o) => os + Number(o.amount || 0), 0), 0);

                                        return (
                                            <div key={date} className="bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm">
                                                {/* Date header */}
                                                <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
                                                    <p className="font-semibold text-stone-700 text-sm">
                                                        📅 {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                                                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                                        })}
                                                    </p>
                                                    <div className="flex gap-2 text-xs">
                                                        <span className="bg-spice-100 text-spice-700 px-2 py-0.5 rounded-full font-medium">
                                                            {totalOrders} order{totalOrders !== 1 ? 's' : ''}
                                                        </span>
                                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                            ₹{totalRevenue}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Menus for this day */}
                                                <div className="divide-y divide-stone-100">
                                                    {dayMenus.map(menu => (
                                                        <div key={menu.id} className="p-4">
                                                            {/* Menu info row */}
                                                            <div className="flex gap-3 items-start">
                                                                {menu.photo_url && (
                                                                    <img src={menu.photo_url} alt={menu.name}
                                                                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-amber-100" />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-base">{mealEmoji(menu.meal_type)}</span>
                                                                        <p className="font-semibold text-stone-800 text-sm">{menu.name}</p>
                                                                        <span className="text-xs text-stone-400 capitalize">{menu.meal_type}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <span className="font-bold text-spice-600 text-sm">₹{menu.price}</span>
                                                                        <span className="text-xs text-stone-400">{menu.orders_count || 0}/10 orders</span>
                                                                    </div>
                                                                    {menu.description && (
                                                                        <p className="text-xs text-stone-400 mt-0.5 truncate">{menu.description}</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Orders for this menu */}
                                                            {menu.orders && menu.orders.length > 0 && (
                                                                <div className="mt-3 space-y-2">
                                                                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                                                                        Orders ({menu.orders.length})
                                                                    </p>
                                                                    {menu.orders.map(order => (
                                                                        <div key={order.id}
                                                                            className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2 gap-2">
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-medium text-stone-700 truncate">{order.customer_name}</p>
                                                                                <p className="text-xs text-stone-400">{order.customer_phone}</p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>
                                                                                    {order.status?.replace('_', ' ')}
                                                                                </span>
                                                                                <span className="font-bold text-spice-600 text-sm">₹{order.amount}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* No orders */}
                                                            {(!menu.orders || menu.orders.length === 0) && (
                                                                <p className="mt-2 text-xs text-stone-400 italic">No orders for this menu.</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Lightbox ── */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.85)' }}
                    onClick={() => setLightbox(null)}
                >
                    <button onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-stone-300">×</button>
                    <img src={lightbox} alt="Full view"
                        className="max-w-full max-h-full rounded-2xl shadow-2xl"
                        onClick={e => e.stopPropagation()} />
                </div>
            )}
        </>
    );
}