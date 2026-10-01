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
    plugins: [react()],
    resolve: {
      alias: [
        {
          // antd 3 registers every export of this CommonJS module as an icon,
          // including the 'default' key added by interop. The ES build has none.
          find: /^@ant-design\/icons\/lib\/dist$/,
          replacement: '@ant-design/icons/lib/index.es.js'
        }
      ]
    },
    optimizeDeps: {
      esbuildOptions: {
        // Dev-only pre-bundling includes all of antd 3, whose draft-js
        // dependency (fbjs) expects Node's `global`.
        define: { global: 'globalThis' }
      }
    },
    build: {
      commonjsOptions: {
        // antd 3's rc-menu calls require() inside an ES module.
        transformMixedEsModules: true
      }
    }
  }
});
