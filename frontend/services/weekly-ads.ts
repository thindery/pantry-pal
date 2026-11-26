/**
 * PP-164: weekly-ad hub lookup. Link-out only: no deals are fetched or matched.
 * PP-179: favorite stores per ZIP code.
 */

import { getApiBaseUrl } from '@/lib/env';
import { getBearerToken } from '@/lib/get-bearer-token';

export interface WeeklyAdStore {
  id: string;
  chain: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  weeklyAdUrl: string;
  storeUrl?: string | null;
  note?: string | null;
  isFavorite?: boolean;
  is_favorite?: boolean;
}

export interface WeeklyAdsResult {
  zip: string;
  /** True only when we have real local stores for this ZIP. */
  covered: boolean;
  stores: WeeklyAdStore[];
  /** National weekly-ad finders, only when not covered. */
  fallback: WeeklyAdStore[];
}

export const WEEKLY_ADS_ZIP_KEY = 'ph_weekly_ads_zip';

export function cleanZip(raw: string): string | null {
  const value = raw.trim().split('-')[0];
  return /^\d{5}$/.test(value) ? value : null;
}

export async function getWeeklyAds(zip: string): Promise<WeeklyAdsResult> {
  const token = await getBearerToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token != null) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${getApiBaseUrl()}/api/weekly-ads?zip=${encodeURIComponent(zip)}`, { headers });
  if (!response.ok) throw new Error(response.status === 400 ? 'Enter a 5-digit US ZIP code.' : 'Could not load stores. Please try again.');
  const json = (await response.json()) as { data: WeeklyAdsResult };
  return json.data;
}

export async function favoriteStore(zip: string, storeId: string): Promise<void> {
  const token = await getBearerToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token != null) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(
    `${getApiBaseUrl()}/api/weekly-ads/favorites/${encodeURIComponent(zip)}/${encodeURIComponent(storeId)}`,
    { method: 'PUT', headers }
  );
  if (!response.ok) {
    throw new Error(response.status === 400 ? 'Enter a 5-digit US ZIP code.' : 'Could not favorite store. Please try again.');
  }
}

export async function unfavoriteStore(zip: string, storeId: string): Promise<void> {
  const token = await getBearerToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token != null) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(
    `${getApiBaseUrl()}/api/weekly-ads/favorites/${encodeURIComponent(zip)}/${encodeURIComponent(storeId)}`,
    { method: 'DELETE', headers }
  );
  if (!response.ok) {
    throw new Error(response.status === 400 ? 'Enter a 5-digit US ZIP code.' : 'Could not unfavorite store. Please try again.');
  }
}
