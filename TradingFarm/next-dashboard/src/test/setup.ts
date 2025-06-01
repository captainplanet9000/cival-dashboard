import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with jest-dom's matchers
expect.extend(matchers);

// Clean up after each test case (e.g., unmounting React trees)
afterEach(() => {
  cleanup();
});
