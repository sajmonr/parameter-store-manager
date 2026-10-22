import { defineConfig } from 'vitest/config';

// Main-process and pure tests run in Node. Component tests opt into a DOM
// with a `// @vitest-environment jsdom` comment.
export default defineConfig({
  test: {
    // noAws first: no test may reach AWS or the network.
    setupFiles: ['./src/main/test/noAws.ts', './src/renderer/test/setup.ts']
  }
});
