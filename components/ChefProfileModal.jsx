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
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-stone-200
                         flex items-center justify-center text-stone-500 hover:text-stone-800 text-lg font-bold transition"
            >
              ×
            </button>

            {/* Chef identity */}
            <div className="flex items-center gap-4 pr-10">
              <div className="relative flex-shrink-0">
                <img
                  src={chef.photo_url || 'https://placehold.co/72x72/f97316/white?text=Chef'}
                  alt={chef.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-200"
                />
                {/* Online badge */}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-stone-800 leading-tight">{chef.name}</h2>
                {chef.place_of_origin && (
                  <p className="text-sm text-stone-500 mt-0.5">📍 From {chef.place_of_origin}</p>
                )}
                <a
                  href={`tel:${chef.phone}`}
                  className="inline-block text-sm text-spice-600 font-semibold mt-1 hover:underline"
                >
                  📞 {chef.phone}
                </a>
              </div>
            </div>

            {/* Specialties pill */}
            {chef.recipe_list && (
              <div className="mt-3 flex items-start gap-2 bg-white/70 rounded-xl px-3 py-2 border border-orange-100">
                <span className="text-base flex-shrink-0">🍽️</span>
                <p className="text-sm text-stone-600 leading-snug">{chef.recipe_list}</p>
              </div>
            )}
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1">

            {/* Bio */}
            {chef.bio && (
              <div className="px-5 pt-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">About</p>
                <p className="text-sm text-stone-600 leading-relaxed">{chef.bio}</p>
              </div>
            )}

            {/* Kitchen photo */}
            {chef.kitchen_photo_url && (
              <div className="px-5 pt-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">🍳 Kitchen</p>
                <img
                  src={chef.kitchen_photo_url}
                  alt="Kitchen"
                  onClick={() => setLightbox(chef.kitchen_photo_url)}
                  className="w-full h-44 object-cover rounded-2xl border border-amber-100 cursor-zoom-in"
                />
              </div>
            )}

            {/* Gallery */}
            <div className="px-5 pt-4 pb-6">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">📸 Gallery</p>

              {loading ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-stone-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : gallery.length === 0 ? (
                <div className="border-2 border-dashed border-amber-200 rounded-2xl py-8 text-center">
                  <p className="text-2xl mb-1">🖼️</p>
                  <p className="text-sm text-stone-400">No gallery photos yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map(img => (
                    <img
                      key={img.id}
                      src={img.photo_url}
                      alt="Gallery"
                      onClick={() => setLightbox(img.photo_url)}
                      className="aspect-square w-full object-cover rounded-xl border border-amber-100 cursor-zoom-in hover:opacity-90 transition"
                    />
                  ))}
                </div>
              )}
            </div>
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
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl font-bold leading-none hover:text-stone-300"
          >×</button>
          <img
            src={lightbox}
            alt="Full view"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}