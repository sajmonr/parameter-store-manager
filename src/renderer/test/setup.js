// Browser APIs that jsdom lacks but antd and the app use.
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);

  const { default: TimeAgo } = await import('javascript-time-ago');
  const { default: en } = await import('javascript-time-ago/locale/en');
  TimeAgo.addDefaultLocale(en);

  window.matchMedia = query => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {}
  });

  // Reports a fixed size, so measured components such as the table render.
  window.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }

    observe(target) {
      this.callback([{ target, contentRect: { width: 900, height: 600 } }]);
    }

    unobserve() {}

    disconnect() {}
  };

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(() => Promise.resolve()) }
  });
}
