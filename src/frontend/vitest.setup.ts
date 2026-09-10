import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

window.ResizeObserver = window.ResizeObserver ?? class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (typeof window.requestAnimationFrame !== 'function') {
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => undefined;
}