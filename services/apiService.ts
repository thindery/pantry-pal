import { PantryItem, Activity, ActivityType, TierInfo, BarcodeProduct } from '../types';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Global variable to store the getToken function
let getTokenRef: (() => Promise<string | null>) | null = null;

// Helper for API calls
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  if (getTokenRef) {
    const token = await getTokenRef();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Pantry Items API
export const getItems = (): Promise<PantryItem[]> =>
  fetchApi<PantryItem[]>('/api/items');

export const getItem = (id: string): Promise<PantryItem> =>
  fetchApi<PantryItem>(`/api/items/${id}`);

export const createItem = (item: Omit<PantryItem, 'id' | 'lastUpdated'>): Promise<PantryItem> =>
  fetchApi<PantryItem>('/api/items', {
    method: 'POST',
    body: JSON.stringify(item),
  });

export const updateItem = (id: string, item: Partial<PantryItem>): Promise<PantryItem> =>
  fetchApi<PantryItem>(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });

export const deleteItem = (id: string): Promise<void> =>
  fetchApi<void>(`/api/items/${id}`, {
    method: 'DELETE',
  });

// Activities API
export const getActivities = (): Promise<Activity[]> =>
  fetchApi<Activity[]>('/api/activities');

export const logActivity = (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> =>
  fetchApi<Activity>('/api/activities', {
    method: 'POST',
    body: JSON.stringify(activity),
  });

// Scan/Usage API
export const processScan = (scanData: any) =>
  fetchApi('/api/scan-receipt', {
    method: 'POST',
    body: JSON.stringify(scanData),
  });

export const processUsage = (usageData: any) =>
  fetchApi('/api/visual-usage', {
    method: 'POST',
    body: JSON.stringify(usageData),
  });

// Product Lookup API (includes cache status)
export const getProductByBarcode = async (barcode: string): Promise<{ product: BarcodeProduct | null; fromCache?: boolean; cachedAt?: string }> => {
  const result = await fetchApi<{ product: any; fromCache?: boolean; cachedAt?: string }>(`/api/products/barcode/${barcode}`);
  
  if (!result.product) {
    return result as { product: BarcodeProduct | null; fromCache?: boolean; cachedAt?: string };
  }
  
  // Transform backend response to match BarcodeProduct type
  const p = result.product;
  
  // Handle image_url -> image mapping
  if (p.image_url && !p.image) {
    p.image = p.image_url;
  }
  
  // Handle ingredients: string -> string[] if needed
  if (typeof p.ingredients === 'string') {
    p.ingredients = p.ingredients.split(/,|\n/).map((i: string) => i.trim()).filter((i: string) => i.length > 0);
  }
  
  // Handle source/stale mapping
  if (result.fromCache && !p.source) {
    p.source = result.cachedAt ? 'stale' : 'cache';
  } else if (!p.source) {
    p.source = 'live';
  }
  
  // Handle updatedAt mapping
  if (p.info_last_synced && !p.updatedAt) {
    p.updatedAt = p.info_last_synced;
  }
  
  return result as { product: BarcodeProduct | null; fromCache?: boolean; cachedAt?: string };
};

// Subscription API
export const getTierInfo = (): Promise<TierInfo> =>
  fetchApi<TierInfo>('/api/subscription/tier');

export const createCheckoutSession = (data: {
  tier: 'pro' | 'family';
  billingInterval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> =>
  fetchApi<{ sessionId: string; url: string }>('/api/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Auth token setup hook using Clerk
export function useSetupAuthToken() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Store the getToken function in the global ref
    getTokenRef = async () => {
      try {
        return await getToken();
      } catch (err) {
        console.error('Failed to get auth token:', err);
        return null;
      }
    };

    return () => {
      getTokenRef = null;
    };
  }, [getToken]);
}
