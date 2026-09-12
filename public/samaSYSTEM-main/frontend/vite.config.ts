import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/sama/',
  build: {
    outDir: 'dist',
  },
  plugins: [react(), {
  name: 'sama-root-slash',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/sama' && req.headers.accept?.includes('text/html')) {
        req.url = '/sama/';
      }
      next();
    });
  },
}],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3102,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3103',
        changeOrigin: true,
      },
    },
  },
});
