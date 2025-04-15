// Vitest setup file

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock fetch API
globalThis.fetch = vi.fn(() => Promise.resolve(new Response()));
globalThis.Request = vi.fn(() => ({})) as unknown as typeof Request;
globalThis.Response = vi.fn(() => ({ 
  json: vi.fn(), 
  text: vi.fn(),
  arrayBuffer: vi.fn(),
  blob: vi.fn(),
  formData: vi.fn(),
  ok: true,
  status: 200
})) as unknown as typeof Response;

// Add static Response methods
globalThis.Response.error = vi.fn();
globalThis.Response.json = vi.fn();
globalThis.Response.redirect = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockImplementation((param) => {
      if (param === 'farmId') return '1';
      if (param === 'goalId') return '1';
      return null;
    }),
  }),
  usePathname: () => '/dashboard',
  redirect: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(({ href, children, ...rest }) => {
      // Create a mock anchor element without using JSX
      const mockAnchor = {
        type: 'a',
        props: {
          href,
          ...rest,
          children
        }
      };
      return mockAnchor;
    }),
  };
});

// Mock date-fns
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: vi.fn().mockImplementation(() => '2025-04-10'),
    formatDistanceToNow: vi.fn().mockImplementation(() => '5 days ago'),
    formatRelative: vi.fn().mockImplementation(() => '5 days ago'),
    subDays: vi.fn().mockImplementation((date, days) => new Date(date.getTime() - days * 86400000)),
    addDays: vi.fn().mockImplementation((date, days) => new Date(date.getTime() + days * 86400000)),
  };
});

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'example-anon-key';

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React does not recognize the') ||
      args[0].includes('Warning: ') ||
      args[0].includes('Invalid DOM property'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [0];
  private readonly _callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this._callback = callback;
  }

  observe(): void {
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: 1,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      target: {} as Element,
      time: Date.now()
    };
    this._callback([mockEntry], this);
  }

  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock window.matchMedia for tests (Vitest/JSDOM does not implement it by default)
if (!window.matchMedia) {
  window.matchMedia = function (query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

// Mock scrollIntoView for all elements
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}
