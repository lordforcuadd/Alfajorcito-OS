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
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'Alfajorcito OS - Centro Académico',
        short_name: 'Alfajorcito',
        description: 'Centro de Operaciones Académicas + Investigación + Segundo Cerebro',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#E8A598',
        background_color: '#FAF8F5',
        display: 'standalone',
        orientation: 'any',
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
          }

          // Modular Feature Chunks
          if (id.includes('src/services/aiService') || id.includes('src\\services\\aiService')) {
            return 'feature-ai';
          }
          if (id.includes('src/modules/notes/InteractiveGraph') || id.includes('src\\modules\\notes\\InteractiveGraph') || id.includes('src/modules/notes/GraphAIChatModal') || id.includes('src\\modules\\notes\\GraphAIChatModal')) {
            return 'feature-graph';
          }
          if (
            id.includes('src/modules/research') ||
            id.includes('src\\modules\\research') ||
            id.includes('src/modules/citations') ||
            id.includes('src\\modules\\citations') ||
            id.includes('src/services/academicApis') ||
            id.includes('src\\services\\academicApis') ||
            id.includes('src/utils/citationEngine') ||
            id.includes('src\\utils\\citationEngine')
          ) {
            return 'feature-academic-core';
          }
        }
      }
    }
  }
});
