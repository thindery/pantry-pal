import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock import.meta.env for tests
 vi.mock('../services/apiService', async () => {
  const actual = await vi.importActual('../services/apiService');
  return {
    ...actual,
  };
});

// Global fetch mock setup (can be overridden in individual tests)
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});
