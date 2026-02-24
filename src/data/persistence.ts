// TASK-008: Activity localStorage persistence

const STORAGE_PREFIX = 'pantrypal_';

interface PersistedState <T> {
  data: T;
  timestamp: number;
  version: number;
}

export const createPersistentState = <T>(
  key: string,
  defaultValue: T,
  version: number = 1
) => {
  const fullKey = STORAGE_PREFIX + key;
  
  const load = (): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(fullKey);
      if (!stored) return defaultValue;
      
      const parsed: PersistedState<T> = JSON.parse(stored);
      // Version check for migrations
      if (parsed.version !== version) {
        console.log(`State version mismatch (${parsed.version} vs ${version}), resetting`);
        return defaultValue;
      }
      return parsed.data;
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      return defaultValue;
    }
  };
  
  const save = (data: T): void => {
    if (typeof window === 'undefined') return;
    try {
      const state: PersistedState<T> = {
        data,
        timestamp: Date.now(),
        version
      };
      localStorage.setItem(fullKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };
  
  const clear = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(fullKey);
  };
  
  return { load, save, clear };
};

// Activity-specific persistence
export const activityStorage = createPersistentState('activities_v1', [], 1);
export const dashboardFilterStorage = createPersistentState('dashboard_filters', { sort: 'date', order: 'desc' }, 1);
