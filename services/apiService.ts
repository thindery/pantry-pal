import { PantryItem, Activity, ActivityType } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper for API calls
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
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
