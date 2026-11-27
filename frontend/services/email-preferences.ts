/**
 * PP-137: opt-in weekly low-stock email preferences.
 * PP-235: opt-in weekly recipe email (off by default, shown only when the server has marketing mail on).
 */

import { getApiBaseUrl } from '@/lib/env';
import { getBearerToken } from '@/lib/get-bearer-token';

export interface EmailPreferences {
  /** False while the server flag LOW_STOCK_DIGEST_ENABLED is off; hide the toggle. */
  available: boolean;
  lowStockDigest: boolean;
  /** False until marketing email is live; hide the weekly recipe toggle. */
  weeklyRecipesAvailable?: boolean;
  weeklyRecipes?: boolean;
}

export interface EmailPreferencesUpdate {
  lowStockDigest?: boolean;
  weeklyRecipes?: boolean;
  thresholdConfig?: Record<string, number>;
  itemThresholdOverrides?: Record<string, number>;
}

async function request(method: 'GET' | 'PUT', body?: EmailPreferencesUpdate): Promise<EmailPreferences> {
  const token = await getBearerToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token != null) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${getApiBaseUrl()}/api/email-preferences`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = (await response.json()) as { data?: EmailPreferences };
  return {
    available: json?.data?.available === true,
    lowStockDigest: json?.data?.lowStockDigest === true,
    weeklyRecipesAvailable: json?.data?.weeklyRecipesAvailable === true,
    weeklyRecipes: json?.data?.weeklyRecipes === true,
  };
}

export function getEmailPreferences(): Promise<EmailPreferences> {
  return request('GET');
}

export function updateEmailPreferences(update: EmailPreferencesUpdate): Promise<EmailPreferences> {
  return request('PUT', update);
}
