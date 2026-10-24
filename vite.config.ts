/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dreamlog',
        short_name: 'Dreamlog',
        description: 'A dream journal encrypted on your device',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#14122b',
        theme_color: '#14122b',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  test: {
    // WebCrypto in Node is the same API the browser has; no DOM is needed for the unit tests.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
  },
})
