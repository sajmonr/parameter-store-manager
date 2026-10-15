import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Entries follow the electron-vite defaults: src/main, src/preload and
// src/renderer/index.html. Packages in `dependencies` stay external and are
// loaded from node_modules at runtime; everything else (including the
// ESM-only electron-store and electron-debug) is bundled.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()]
  }
});
