import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base '/fokus3/' only in production: GitHub Pages serves from a sub-path,
// while the dev server stays at '/' for a friction-free local workflow.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fokus3/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest: we ship our own service worker (src/sw.ts) because
      // web push needs custom 'push' / 'notificationclick' handlers.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Fokus3',
        short_name: 'Fokus3',
        description: 'Maximal 3 Aufgaben pro Tag. Nicht mehr.',
        lang: 'de',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#fafafa',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Run the service worker in dev too, so the push flow is testable locally.
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
}))
