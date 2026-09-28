/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './{components,pages,context,hooks,services}/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#FFF3EA',
          100: '#FFE4CC',
          200: '#FFCBA0',
          300: '#FFAD6E',
          400: '#FF9947',
          500: '#F0803A',
          600: '#DE6B38',
          700: '#B5542A',
          800: '#8A4318',
          900: '#6B3412',
        },
        devotion: {
          light: '#FDFBF7',
          dark: '#2D2A26',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};
