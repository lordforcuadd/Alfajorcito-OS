import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'alfajor.png'],
      manifest: {
        name: 'Alfajorcito OS - Centro Académico',
        short_name: 'Alfajorcito',
        description: 'Centro de Operaciones Académicas + Investigación + Segundo Cerebro',
        theme_color: '#E8A598',
        background_color: '#FAF8F5',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-dom') ||
              id.includes('/react/') ||
              id.includes('\\react\\') ||
              id.includes('scheduler') ||
              id.includes('react/jsx-runtime') ||
              id.includes('react\\jsx-runtime')
            ) {
              return 'vendor-react';
            }
            if (id.includes('dexie')) return 'vendor-db';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (
              id.includes('jszip') ||
              id.includes('canvas-confetti') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')
            ) {
              return 'vendor-utils';
            }
          }
        }
      }
    }
  }
});
