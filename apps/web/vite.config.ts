import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Listen on IPv4 so http://127.0.0.1:5173 works on every Windows setup.
    host: '127.0.0.1',
    // The browser talks to one origin; Vite forwards API calls to Laravel (`php artisan serve`).
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
      '/sanctum': { target: 'http://127.0.0.1:8000', changeOrigin: false },
      '/storage': { target: 'http://127.0.0.1:8000', changeOrigin: false }, // uploaded pictures
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          radix: ['radix-ui'],
        },
      },
    },
  },
})
