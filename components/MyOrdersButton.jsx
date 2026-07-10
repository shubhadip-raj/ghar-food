'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const MyOrdersModal = dynamic(() => import('./MyOrdersModal'), { ssr: false });

export default function MyOrdersButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800
                   text-sm font-semibold px-3 py-2 rounded-xl transition"
        title="My Orders"
      >
        <span className="text-base">🛵</span>
        <span className="hidden sm:inline">My Orders</span>
      </button>

      {open && <MyOrdersModal onClose={() => setOpen(false)} />}
    </>
  );
}