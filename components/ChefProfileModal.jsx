'use client';
import { useEffect, useState } from 'react';

export default function ChefProfileModal({ chef, onClose }) {
    const [gallery, setGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState(null);

    useEffect(() => {
        fetch(`/api/chefs/${chef.id}/gallery`)
            .then(r => r.json())
            .then(d => setGallery(d.images || []))
            .catch(() => setGallery([]))
            .finally(() => setLoading(false));
    }, [chef.id]);

    // Close on Escape key
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

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
                onClick={onClose}
            >
                {/* Modal */}
                <div
                    className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    style={{ maxHeight: "92vh" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ================= HEADER (FIXED) ================= */}
                    <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 px-5 pt-6 pb-5 border-b border-amber-100 flex-shrink-0">

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition"
                        >
                            ×
                        </button>

                        {/* Chef Info */}
                        <div className="flex items-center gap-4 pr-10">
                            <div className="relative">
                                <img
                                    src={
                                        chef.photo_url ||
                                        "https://placehold.co/72x72/f97316/white?text=Chef"
                                    }
                                    alt={chef.name}
                                    className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-200"
                                />

                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-stone-800">
                                    {chef.name}
                                </h2>

                                {chef.place_of_origin && (
                                    <p className="text-sm text-stone-500">
                                        📍 From {chef.place_of_origin}
                                    </p>
                                )}

                                <a
                                    href={`tel:${chef.phone}`}
                                    className="inline-block mt-1 text-sm font-semibold text-orange-600 hover:underline"
                                >
                                    📞 {chef.phone}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* ================= SCROLL AREA ================= */}
                    <div className="flex-1 overflow-y-auto">

                        {/* Recipe List */}
                        {chef.recipe_list && (
                            <div className="p-5">
                                <div className="rounded-xl bg-white border border-orange-100 p-3 flex gap-2">
                                    <span>🍽️</span>
                                    <p className="text-sm text-stone-600">
                                        {chef.recipe_list}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Bio */}
                        {chef.bio && (
                            <div className="px-5 pb-2">
                                <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span>👨‍🍳</span>
                                        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                                            About the Chef
                                        </p>
                                    </div>

                                    <p className="text-sm leading-7 text-stone-700">
                                        {chef.bio}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Kitchen Photo */}
                        {chef.kitchen_photo_url && (
                            <div className="px-5 pt-4">
                                <h3 className="font-semibold text-stone-800 mb-3">
                                    🍳 Kitchen
                                </h3>

                                <div
                                    className="relative overflow-hidden rounded-2xl shadow-md cursor-pointer group"
                                    onClick={() =>
                                        setLightbox(chef.kitchen_photo_url)
                                    }
                                >
                                    <img
                                        src={chef.kitchen_photo_url}
                                        alt="Kitchen"
                                        className="w-full h-56 object-cover transition duration-300 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />

                                    <div className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 rounded-lg text-xs">
                                        🔍 View
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Gallery */}
                        <div className="px-5 pt-5 pb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-stone-800">
                                    📸 Gallery
                                </h3>

                                {!loading && gallery.length > 0 && (
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                        {gallery.length} Photos
                                    </span>
                                )}
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="aspect-square bg-stone-100 rounded-xl animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : gallery.length === 0 ? (
                                <div className="border-2 border-dashed border-orange-200 rounded-2xl py-10 text-center">
                                    <p className="text-3xl mb-2">🖼️</p>
                                    <p className="text-sm text-stone-400">
                                        No gallery photos yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {gallery.map((img) => (
                                        <div
                                            key={img.id}
                                            className="relative group overflow-hidden rounded-xl cursor-pointer"
                                            onClick={() =>
                                                setLightbox(img.photo_url)
                                            }
                                        >
                                            <img
                                                src={img.photo_url}
                                                alt="Gallery"
                                                className="aspect-square w-full object-cover transition duration-300 group-hover:scale-110"
                                            />

                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />

                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <span className="text-white text-xl">
                                                    🔍
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= LIGHTBOX ================= */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.85)" }}
                    onClick={() => setLightbox(null)}
                >
                    <button
                        onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-stone-300"
                    >
                        ×
                    </button>

                    <img
                        src={lightbox}
                        alt="Full view"
                        className="max-w-full max-h-full rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}