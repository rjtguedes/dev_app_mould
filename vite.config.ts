import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      strategies: 'generateSW',
      includeAssets: [],
      manifest: {
        name: 'Industrack - Operador Mould',
        short_name: 'Industrack',
        description: 'Sistema de controle de produção Industrack',
        theme_color: '#1e40af',
        background_color: '#1e3a8a',
        icons: [
          {
            src: 'https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/icons/android-launchericon-72-72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/icons/android-launchericon-96-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/icons/android-launchericon-144-144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/icons/android-launchericon-192-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/icons/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: new RegExp('/*'),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'app-cache'
          }
        }]
      }
    })
  ],
  base: '/',
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      '@supabase/supabase-js',
      'crypto-js',
      'mqtt'
    ],
  },
  define: {
    global: 'globalThis',
    'process.env': 'import.meta.env',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  }
});
