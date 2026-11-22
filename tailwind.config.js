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
        // ---- vSeva Design Core (docs/design-core.md). New names only: nothing here changes an existing class.
        canvas: '#F2EEE7',
        surface: '#FBFAF7',
        sunken: '#E9E3D8',
        line: '#DDD5C7',
        ink: { DEFAULT: '#1D1D1B', 2: '#57534B', 3: '#6F6A60' },
        brand: { 50: '#FFF4EA', 100: '#FCE2CC', 200: '#F8C49A', DEFAULT: '#E8730C', 600: '#CF6409', 700: '#A44E07', 800: '#7A3A06' },
        block: { sky: '#9ED6DF', tea: '#245E55', lavender: '#808BC5', mustard: '#EAC119', pink: '#EAA7C7', seashell: '#EAE4DA' },
        ok: { DEFAULT: '#1F6B5F', soft: '#D9EAE5' },
        warn: { DEFAULT: '#6B5409', soft: '#F7E9B8' },
        err: { DEFAULT: '#B33A39', soft: '#F6DCDA', solid: '#C63F3E' },
        info: { DEFAULT: '#1E5A66', soft: '#DCEFF2' },
      },
      fontFamily: {
        // Design Core (Phase 2): the app reads in Geist; headings that used Playfair now use the display face.
        // Noto Sans Gujarati / Devanagari carry Gujarati and Hindi, which Geist and Bricolage lack.
        sans: ['Geist', '"Noto Sans Gujarati"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        serif: ['"Bricolage Grotesque"', '"Noto Sans Gujarati"', '"Noto Sans Devanagari"', 'Geist', 'system-ui', 'sans-serif'],
        // The SSG landing page keeps its original face
        manrope: ['Manrope', 'sans-serif'],
        // Design Core faces; the Noto families carry Gujarati and Hindi, which Bricolage and Geist lack
        display: ['"Bricolage Grotesque"', '"Noto Sans Gujarati"', '"Noto Sans Devanagari"', 'Geist', 'system-ui', 'sans-serif'],
        body: ['Geist', '"Noto Sans Gujarati"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        // (not named `mono`: that would change the app's existing font-mono text)
        'core-mono': ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '24px',
        tile: '22px',
        field: '16px',
        sheet: '28px',
      },
      boxShadow: {
        nav: '0 12px 32px rgb(29 29 27 / 0.28)',
        sheet: '0 -12px 40px rgb(29 29 27 / 0.14)',
      },
      // Used by brands/ssg/Landing.tsx (rotating sunburst, drifting clouds)
      keyframes: {
        'ssg-spin': { to: { transform: 'translate(-50%, -50%) rotate(360deg)' }, from: { transform: 'translate(-50%, -50%) rotate(0deg)' } },
        'ssg-float': { '0%, 100%': { transform: 'translateX(0)' }, '50%': { transform: 'translateX(14px)' } },
        // Design Core motion
        'core-rise': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'core-sheet': { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'none' } },
        'core-pulse': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
      },
      animation: {
        'ssg-rays': 'ssg-spin 180s linear infinite',
        'ssg-float': 'ssg-float 9s ease-in-out infinite',
        'core-rise': 'core-rise 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'core-sheet': 'core-sheet 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'core-pulse': 'core-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
