'use client';
import { useState, useEffect } from 'react';

const NAMES = [
  'Priya','Rahul','Sunita','Vikram','Ananya','Arjun','Meera','Rohan',
  'Kavitha','Amit','Pooja','Sanjay','Divya','Kartik','Nisha','Suresh',
  'Lalitha','Deepak','Rekha','Arun','Swathi','Rajesh','Pallavi','Nikhil',
  'Lakshmi','Varun','Shreya','Mohan','Geeta','Aditya','Ritu','Prakash',
];
const CITIES = [
  'Mumbai','Bangalore','Delhi','Hyderabad','Chennai','Pune','Kolkata',
  'Jaipur','Ahmedabad','Lucknow','Surat','Nagpur','Indore','Kochi',
  'Chandigarh','Bhopal','Vadodara','Coimbatore','Visakhapatnam','Mysuru',
];
const DISHES = [
  'Chicken Biryani','Dal Makhani','Rajma Chawal','Chole Bhature',
  'Butter Chicken','Palak Paneer','Masala Dosa','Idli Sambar',
  'Mutton Curry','Aloo Paratha','Fish Curry','Paneer Tikka',
  'Veg Thali','Mutton Biryani','Prawn Masala','Momos',
  'Pav Bhaji','Misal Pav','Poha','Upma','Rava Dosa','Appam',
  'Bisi Bele Bath','Sambar Rice','Lemon Rice',
];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeActivity() {
  return {
    id: Math.random(),
    text: `${random(NAMES)} from ${random(CITIES)} just ordered ${random(DISHES)}`,
  };
}

export default function ActivityTicker() {
  const [items, setItems] = useState(() => Array.from({ length: 5 }, makeActivity));
  const [visible, setVisible] = useState(true);

  // Add a new fake activity every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => [makeActivity(), ...prev.slice(0, 9)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute bottom-6 right-4 z-[999] w-72 pointer-events-none select-none">
      <div className="relative">
        {/* Close button — needs pointer events */}
        <button
          onClick={() => setVisible(false)}
          className="pointer-events-auto absolute -top-2 -right-2 z-10 w-5 h-5 bg-stone-400 hover:bg-stone-600 text-white rounded-full text-xs flex items-center justify-center leading-none shadow"
          title="Hide activity">
          ×
        </button>

        {/* Scrolling feed */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
          <div className="px-3 py-2 bg-spice-500 flex items-center gap-2">
            <span className="text-white text-xs font-bold animate-pulse">🔴 LIVE</span>
            <span className="text-orange-100 text-xs font-semibold">People ordering from Ghar.food</span>
          </div>
          <div className="divide-y divide-amber-50 max-h-40 overflow-hidden">
            {items.slice(0, 4).map((item, i) => (
              <div key={item.id}
                className="px-3 py-2 text-xs text-stone-600 flex items-center gap-2"
                style={{
                  opacity: i === 0 ? 1 : i === 1 ? 0.85 : i === 2 ? 0.65 : 0.45,
                  transition: 'opacity 0.5s',
                }}>
                <span className="text-base flex-shrink-0">🍽️</span>
                <span className="leading-snug">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
