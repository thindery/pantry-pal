import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeatureFlags } from '../src/hooks/useFeatureFlags';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useFeatureFlags', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useFeatureFlags());
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    
    expect(result.current.flags.fabEnabled).toBe(false);
  });

  it('should enable a feature flag', async () => {
    const { result } = renderHook(() => useFeatureFlags());
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.enable('fabEnabled');
    });

    expect(result.current.flags.fabEnabled).toBe(true);
  });

  it('should disable a feature flag', async () => {
    const { result } = renderHook(() => useFeatureFlags());
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.enable('fabEnabled');
    });
    expect(result.current.flags.fabEnabled).toBe(true);

    act(() => {
      result.current.disable('fabEnabled');
    });
    expect(result.current.flags.fabEnabled).toBe(false);
  });

  it('should toggle a feature flag', async () => {
    const { result } = renderHook(() => useFeatureFlags());
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.toggle('fabEnabled');
    });
    expect(result.current.flags.fabEnabled).toBe(true);

    act(() => {
      result.current.toggle('fabEnabled');
    });
    expect(result.current.flags.fabEnabled).toBe(false);
  });

  it('should persist to localStorage', async () => {
    const { result } = renderHook(() => useFeatureFlags());
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.enable('fabEnabled');
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    // Check that at least one call contains the enabled flag
    const calls = localStorageMock.setItem.mock?.calls || [];
    const hasEnabled = calls.some(call => {
      const value = call?.[1];
      return typeof value === 'string' && value.includes('"fabEnabled":true');
    });
    expect(hasEnabled).toBe(true);
  });

  it('should load from localStorage', async () => {
    localStorageMock.setItem('pantry-pal-feature-flags', JSON.stringify({ fabEnabled: true }));

    const { result } = renderHook(() => useFeatureFlags());
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.flags.fabEnabled).toBe(true);
  });

  it('should reset to defaults', async () => {
    const { result } = renderHook(() => useFeatureFlags());
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.enable('fabEnabled');
    });
    expect(result.current.flags.fabEnabled).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.flags.fabEnabled).toBe(false);
  });
});
