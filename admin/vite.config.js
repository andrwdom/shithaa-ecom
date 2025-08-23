import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'lucide-react',
      '@hello-pangea/dnd',
      'react-hot-toast',
      'react-toastify',
      'clsx',
      'tailwind-merge'
    ],
    exclude: [],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('@hello-pangea/dnd')) {
              return 'vendor-dnd';
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'vendor-icons';
            }
            return 'vendor';
          }
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
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