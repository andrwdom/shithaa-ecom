import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['react-toastify', 'react-hot-toast', 'react-icons'],
        },
      },
    },
  },
  server: { 
    port: 5174,
    host: true,
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: ['admin.shithaa.in'],
  },
})