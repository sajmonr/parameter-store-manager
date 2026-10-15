// Browser APIs that jsdom lacks but antd and the app use.
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);

  const { default: TimeAgo } = await import('javascript-time-ago');
  const { default: en } = await import('javascript-time-ago/locale/en');
  TimeAgo.addDefaultLocale(en);

  window.matchMedia = query =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    }) as unknown as MediaQueryList;

  // Reports a fixed size, so measured components such as the table render.
  window.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe(target: Element) {
      const entry = { target, contentRect: { width: 900, height: 600 } };
      this.callback([entry as ResizeObserverEntry], this);
    }

    unobserve() {}

    disconnect() {}
  };

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(() => Promise.resolve()) }
  });
}
