import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  // '/cookie-prophet/' when deployed to GitHub Pages project site (via VITE_BASE)
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    'process.env': {},
  },
  server: {
    port: 3100,
  },
});
