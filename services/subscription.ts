/**
 * Subscription API service for frontend
 * Handles tier info, checkout, and subscription management
 */

import { useAuth } from '@clerk/clerk-react';
import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Types
export type UserTier = 'free' | 'pro' | 'family';

export interface UserTierInfo {
  tier: UserTier;
  limits: {
    maxItems: number;
    receiptScansPerMonth: number;
    aiCallsPerMonth: number;
    voiceAssistant: boolean;
    multiDevice: boolean;
    sharedInventory: boolean;
    maxFamilyMembers: number;
  };
  usage: {
    currentItems: number;
    receiptScansThisMonth: number;
    aiCallsThisMonth: number;
    voiceSessionsThisMonth: number;
  };
  subscription: {
    status: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscriptionEndDate: string;
  } | null;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

// Helper for API calls with auth
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await (window as any).__clerkGetToken?.();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `API error: ${response.status}`);
  }

  return response.json();
}

// API Functions
export async function getTierInfo(): Promise<UserTierInfo> {
  const response = await fetchApi<{ success: boolean; data: UserTierInfo }>('/api/subscription/tier');
  return response.data;
}

export async function getItemLimitStatus(): Promise<{
  canAdd: boolean;
  currentItems: number;
  maxItems: number;
  remaining: number;
}> {
  const response = await fetchApi<{
    success: boolean;
    data: {
      canAdd: boolean;
      currentItems: number;
      maxItems: number;
      remaining: number;
    };
  }>('/api/subscription/check-items');
  return response.data;
}

export async function canScanReceipt(): Promise<{
  canScan: boolean;
  remaining: number;
}> {
  const response = await fetchApi<{
    success: boolean;
    data: { canScan: boolean; remaining: number };
  }>('/api/subscription/check-receipt');
  return response.data;
}

export async function canUseVoiceAssistant(): Promise<{
  canUse: boolean;
}> {
  const response = await fetchApi<{
    success: boolean;
    data: { canUse: boolean };
  }>('/api/subscription/check-voice');
  return response.data;
}

export async function createCheckoutSession(
  tier: 'pro' | 'family',
  billingInterval: 'month' | 'year',
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutResponse> {
  const response = await fetchApi<{
    success: boolean;
    data: CheckoutResponse;
  }>('/api/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify({
      tier,
      billingInterval,
      successUrl,
      cancelUrl,
    }),
  });
  return response.data;
}

export async function createCustomerPortal(returnUrl: string): Promise<{ url: string }> {
  const response = await fetchApi<{
    success: boolean;
    data: { url: string };
  }>('/api/subscription/portal', {
    method: 'POST',
    body: JSON.stringify({ returnUrl }),
  });
  return response.data;
}

// React Hook for subscription status
export function useSubscription() {
  const { getToken } = useAuth();
  const [tierInfo, setTierInfo] = useState<UserTierInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store getToken globally for API calls
  (window as any).__clerkGetToken = getToken;

  const fetchTierInfo = useCallback(async () => {
    try {
      setLoading(true);
      const info = await getTierInfo();
      setTierInfo(info);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tier info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTierInfo();
  }, [fetchTierInfo]);

  const isFeatureAvailable = useCallback(
    (feature: 'voice' | 'unlimitedItems' | 'aiScanning' | 'sharedInventory') => {
      if (!tierInfo) return false;

      switch (feature) {
        case 'voice':
          return tierInfo.limits.voiceAssistant;
        case 'unlimitedItems':
          return tierInfo.limits.maxItems === -1;
        case 'aiScanning':
          return tierInfo.limits.receiptScansPerMonth === -1;
        case 'sharedInventory':
          return tierInfo.limits.sharedInventory;
        default:
          return false;
      }
    },
    [tierInfo]
  );

  const getItemsRemaining = useCallback(() => {
    if (!tierInfo) return 0;
    if (tierInfo.limits.maxItems === -1) return Infinity;
    return tierInfo.limits.maxItems - tierInfo.usage.currentItems;
  }, [tierInfo]);

  const getReceiptScansRemaining = useCallback(() => {
    if (!tierInfo) return 0;
    if (tierInfo.limits.receiptScansPerMonth === -1) return Infinity;
    return tierInfo.limits.receiptScansPerMonth - tierInfo.usage.receiptScansThisMonth;
  }, [tierInfo]);

  return {
    tierInfo,
    loading,
    error,
    refresh: fetchTierInfo,
    isPro: tierInfo?.tier === 'pro',
    isFamily: tierInfo?.tier === 'family',
    isPaid: tierInfo?.tier === 'pro' || tierInfo?.tier === 'family',
    isFree: tierInfo?.tier === 'free',
    isFeatureAvailable,
    itemsRemaining: getItemsRemaining(),
    receiptScansRemaining: getReceiptScansRemaining(),
  };
}

// Feature constants
export const FREE_TIER_LIMITS = {
  maxItems: 50,
  receiptScansPerMonth: 5,
};
