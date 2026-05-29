import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Merge all code into one chunk so no bare module specifiers
        // survive into the final output (critical for Android WebView).
        manualChunks: () => 'index',
      },
    },
  },
});
