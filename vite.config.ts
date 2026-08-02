import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Stamped into the bundle so a running client can say which build it is —
  // an installed PWA can keep serving an old one long after a deploy.
  const buildId = new Date().toISOString().slice(5, 16).replace(/[-T:]/g, '');
  return {
    define: {
      __BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Kept separate from dist/server.cjs so the server bundle is never
      // exposed by express.static.
      outDir: 'dist/client',
      emptyOutDir: true,
      target: 'es2020',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
