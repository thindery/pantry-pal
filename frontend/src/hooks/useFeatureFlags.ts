import { useState, useEffect, useCallback } from 'react';

// Feature flag keys - add new flags here
export type FeatureFlagKey = 'fabEnabled' | string;

interface FeatureFlags {
  fabEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  fabEnabled: false, // FAB disabled by default per REMY-280
};

const STORAGE_KEY = 'pantry-pal-feature-flags';

/**
 * Feature flags hook - manages feature toggles with localStorage persistence
 * All flags default to disabled for safety, must be explicitly enabled
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [isLoaded, _setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<FeatureFlags>;
        setFlags({ ...DEFAULT_FLAGS, ...parsed });
      }
    } catch {
      // localStorage unavailable or corrupted, use defaults
    } finally {
      _setIsLoaded(true);
    }
  }, []);

  // Persist flags to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch {
      // localStorage unavailable
    }
  }, [flags]);

  /**
   * Enable a feature flag
   */
  const enable = useCallback((key: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [key]: true }));
  }, []);

  /**
   * Disable a feature flag
   */
  const disable = useCallback((key: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [key]: false }));
  }, []);

  /**
   * Toggle a feature flag
   */
  const toggle = useCallback((key: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /**
   * Set a feature flag to a specific value
   */
  const set = useCallback((key: keyof FeatureFlags, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Reset all flags to defaults
   */
  const reset = useCallback(() => {
    setFlags(DEFAULT_FLAGS);
  }, []);

  return {
    flags,
    isLoaded,
    enable,
    disable,
    toggle,
    set,
    reset,
  };
}

export default useFeatureFlags;
