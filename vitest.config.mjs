import { defineConfig } from 'vitest/config';

// Main-process and pure tests run in Node. Component tests opt into a DOM
// with a `// @vitest-environment jsdom` comment.
export default defineConfig({
  test: {
    setupFiles: ['./src/renderer/test/setup.js']
  }
});
