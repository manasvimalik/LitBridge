/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        maroon: { 50: '#fbf3f3', 100: '#f4dede', 200: '#e6b8b8', 400: '#b45a5a', 600: '#7a2430', 700: '#5e1a24', 800: '#43121a', 900: '#2a0b10' },
        gold: { 300: '#f2d27a', 400: '#e8bd4f', 500: '#d4a02c', 600: '#a97c1c' },
        paper: { 50: '#fdfaf4', 100: '#f7f0e3', 200: '#ede1c9' },
        ink: { 700: '#3a2a24', 800: '#261b17', 900: '#16100d' },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        indic: ['"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Bengali"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
