'use client';
import { useEffect, useState, useRef } from 'react';

async function uploadViaServer(file, bucket) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('bucket', bucket);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

export default function ImagePickerModal({ onSelect, onClose }) {
  const [photos,    setPhotos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/chefs/menu-photos')
      .then(r => r.json())
      .then(d => setPhotos(d.photos || []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setUploadMsg('');
    try {
      const url = await uploadViaServer(file, 'menu-photos');
      // Add to top of list and auto-select
      const newPhoto = { id: url, name: file.name, photo_url: url, meal_type: '', date: '' };
      setPhotos(prev => [newPhoto, ...prev]);
      setSelected(url);
      setUploadMsg('✅ Uploaded! Click "Use This Photo" to confirm.');
    } catch (err) {
      setUploadMsg('❌ ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleConfirm() {
    if (!selected) return;
    onSelect(selected);
    onClose();
  }

  const mealEmoji = type => type === 'lunch' ? '🍱' : type === 'dinner' ? '🌙' : '🍽️';

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-amber-100 flex-shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-stone-800">Choose a Food Photo</h2>
            <p className="text-xs text-stone-400 mt-0.5">Pick from your past menu photos or upload a new one</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 font-bold transition">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-square bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* No photos yet */}
          {!loading && photos.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-amber-200 rounded-2xl">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-stone-500 font-medium">No menu photos yet</p>
              <p className="text-stone-400 text-sm mt-1">Upload a new photo below</p>
            </div>
          )}

          {/* Photo grid */}
          {!loading && photos.length > 0 && (
            <>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                {photos.length} photo{photos.length !== 1 ? 's' : ''} from your menus
              </p>
              <div className="grid grid-cols-3 gap-3">
                {photos.map(photo => {
                  const isSelected = selected === photo.photo_url;
                  return (
                    <div
                      key={photo.id}
                      onClick={() => setSelected(photo.photo_url)}
                      className={`relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition ${
                        isSelected ? 'border-spice-500 shadow-lg' : 'border-transparent hover:border-amber-300'
                      }`}
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.name}
                        className="w-full aspect-square object-cover"
                      />

                      {/* Selected tick */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-spice-500/20 flex items-center justify-center">
                          <div className="w-8 h-8 bg-spice-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                        </div>
                      )}

                      {/* Hover overlay */}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                      )}

                      {/* Meal type badge */}
                      {photo.meal_type && (
                        <div className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded-lg">
                          {mealEmoji(photo.meal_type)}
                        </div>
                      )}

                      {/* Date badge */}
                      {photo.date && (
                        <div className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded-lg">
                          {new Date(photo.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Upload new */}
          <div className="border-t border-stone-100 pt-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
              Or upload a new photo
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-amber-200 hover:border-spice-400 rounded-2xl py-5 text-center transition cursor-pointer disabled:opacity-60"
            >
              {uploading ? (
                <p className="text-stone-500 text-sm">⏳ Uploading…</p>
              ) : (
                <>
                  <div className="text-2xl mb-1">📤</div>
                  <p className="text-stone-500 text-sm font-medium">Upload from device</p>
                  <p className="text-stone-400 text-xs mt-0.5">JPG, PNG · saved to your menu photos</p>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            {uploadMsg && <p className="text-sm font-medium text-spice-600 mt-2">{uploadMsg}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-amber-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl font-semibold hover:bg-stone-50 transition text-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-1 bg-spice-500 hover:bg-spice-600 disabled:bg-stone-200 disabled:text-stone-400
                       disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition text-sm">
            Use This Photo ✓
          </button>
        </div>
      </div>
    </div>
  );
}