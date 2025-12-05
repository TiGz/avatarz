import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Avatarz - AI Avatar Generator',
        short_name: 'Avatarz',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#4f46e5',
        icons: [
          { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
})
