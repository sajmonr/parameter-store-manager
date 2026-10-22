import { defineConfig } from 'vitest/config';

// Main-process and pure tests run in Node. Component tests opt into a DOM
// with a `// @vitest-environment jsdom` comment.
export default defineConfig({
  test: {
    // Tests that render the whole app take about 1s here and up to 5x that
    // on CI's Windows runners, past the 5s default.
    testTimeout: 10_000,
    // noAws first: no test may reach AWS or the network.
    setupFiles: ['./src/main/test/noAws.ts', './src/renderer/test/setup.ts']
  }
});
