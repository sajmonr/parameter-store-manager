import { defineConfig } from 'electron-vite';
import type { Rollup } from 'vite';
import react from '@vitejs/plugin-react';

// zod's comments mention `@__PURE__` in prose, which Rollup reports as an
// annotation it can't use and then drops. The output is unaffected, so only
// that warning, from zod only, is silenced.
const onwarn = (
  warning: Rollup.RollupLog,
  warn: (warning: Rollup.RollupLog) => void
) => {
  if (
    warning.code === 'INVALID_ANNOTATION' &&
    warning.id?.includes('/node_modules/zod/')
  ) {
    return;
  }
  warn(warning);
};

const build = { rollupOptions: { onwarn } };

// Entries follow the electron-vite defaults: src/main, src/preload and
// src/renderer/index.html. Packages in `dependencies` stay external and are
// loaded from node_modules at runtime; everything else (including the
// ESM-only electron-store and electron-debug) is bundled.
export default defineConfig({
  main: { build },
  preload: { build },
  renderer: {
    build,
    plugins: [react()]
  }
});
