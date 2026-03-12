import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const _env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:9999',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-excel': ['xlsx'],
          },
        },
      },
      // Raise warning threshold slightly for chunked builds
      chunkSizeWarningLimit: 600,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: '.',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'vSeva - Vihar Tracking SaaS',
          short_name: 'vSeva',
          description: 'Vihar Tracking and Management System',
          theme_color: '#EA580C',
          background_color: '#FDFBF7',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
