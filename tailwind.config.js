/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './{components,pages,context,hooks,services,brands}/**/*.{ts,tsx}',
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
      // Used by brands/ssg/Landing.tsx (rotating sunburst, drifting clouds)
      keyframes: {
        'ssg-spin': { to: { transform: 'translate(-50%, -50%) rotate(360deg)' }, from: { transform: 'translate(-50%, -50%) rotate(0deg)' } },
        'ssg-float': { '0%, 100%': { transform: 'translateX(0)' }, '50%': { transform: 'translateX(14px)' } },
      },
      animation: {
        'ssg-rays': 'ssg-spin 180s linear infinite',
        'ssg-float': 'ssg-float 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
