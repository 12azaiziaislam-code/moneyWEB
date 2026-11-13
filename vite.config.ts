import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite root is the repo root; the SPA lives in /src and the build goes to /dist.
// Cloudflare Pages Functions (in /functions) are bundled by wrangler, not by Vite.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'i18next', 'react-i18next'],
        },
      },
    },
  },
  server: {
    port: 5173,
    // When a local `wrangler pages dev` (port 8788) is running, the SPA can call the real API.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
});
