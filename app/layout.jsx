import './globals.css';

export const metadata = {
  title: 'Ghar.food – Home-Cooked Meals Near You',
  description: 'Discover home chefs in your neighbourhood. Order fresh, authentic home-cooked meals made with love.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
