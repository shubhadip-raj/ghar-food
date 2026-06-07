/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        spice: {
          50:  '#fff8f0',
          100: '#feecda',
          200: '#fcd4b0',
          300: '#f9b57c',
          400: '#f68c45',
          500: '#f26b1e',
          600: '#e35114',
          700: '#bc3c12',
          800: '#963116',
          900: '#792b16',
        },
        turmeric: {
          400: '#f5c842',
          500: '#e8b308',
        },
        clay:  '#8B4513',
        cream: '#FDF6E3',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Lato"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
