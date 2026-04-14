import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getActivities,
  logActivity,
  scanReceiptBackend,
  processScan,
  processUsage,
  getProductByBarcode,
  getTierInfo,
  createCheckoutSession,
  useSetupAuthToken,
} from '../services/apiService';
import type { PantryItem, Activity, TierInfo } from '../types';

// Mock Clerk's useAuth hook
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token-123'),
  }),
}));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

describe('apiService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockItem: PantryItem = {
    id: 'item-1',
    name: 'Milk',
    quantity: 2,
    unit: 'cartons',
    category: 'dairy',
    lastUpdated: '2026-02-27T10:00:00Z',
    barcode: '1234567890',
  };

  const mockActivity: Activity = {
    id: 'activity-1',
    itemId: 'item-1',
    itemName: 'Milk',
    type: 'ADD',
    amount: 2,
    timestamp: '2026-02-27T10:00:00Z',
    source: 'MANUAL',
  };

  const mockTierInfo: TierInfo = {
    tier: 'pro',
    limits: {
      maxItems: 1000,
      receiptScansPerMonth: 100,
      aiCallsPerMonth: 500,
      voiceAssistant: true,
      multiDevice: true,
      sharedInventory: true,
      maxFamilyMembers: 5,
    },
    usage: {
      currentItems: 45,
      receiptScansThisMonth: 12,
      aiCallsThisMonth: 150,
      voiceSessionsThisMonth: 8,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock import.meta.env
    vi.stubGlobal('import', { meta: { env: { VITE_API_URL: API_URL } } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pantry Items API', () => {
    describe('getItems', () => {
      it('fetches all items successfully', async () => {
        const mockItems = [mockItem];
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems,
        });

        const result = await getItems();

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/items`,
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
        expect(result).toEqual(mockItems);
      });

      it('throws error when fetch fails', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        await expect(getItems()).rejects.toThrow('API error: 500 Internal Server Error');
      });

      it('throws error for 404 response', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

        await expect(getItems()).rejects.toThrow('API error: 404 Not Found');
      });
    });

    describe('getItem', () => {
      it('fetches single item by id', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockItem,
        });

        const result = await getItem('item-1');

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/items/item-1`,
          expect.any(Object)
        );
        expect(result).toEqual(mockItem);
      });
    });

    describe('createItem', () => {
      it('creates item with POST request', async () => {
        const newItem = {
          name: 'Eggs',
          quantity: 12,
          unit: 'units',
          category: 'dairy',
        };
        const createdItem = { ...newItem, id: 'item-2', lastUpdated: '2026-02-27T11:00:00Z' };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => createdItem,
        });

        const result = await createItem(newItem);

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/items`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(newItem),
          })
        );
        expect(result).toEqual(createdItem);
      });

      it('sends correct Content-Type header', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockItem,
        });

        await createItem({
          name: 'Test',
          quantity: 1,
          unit: 'unit',
          category: 'test',
        });

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('updateItem', () => {
      it('updates item with PUT request', async () => {
        const updates = { quantity: 5 };
        const updatedItem = { ...mockItem, ...updates };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedItem,
        });

        const result = await updateItem('item-1', updates);

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/items/item-1`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updates),
          })
        );
        expect(result).toEqual(updatedItem);
      });

      it('handles partial updates', async () => {
        const updates = { name: 'Organic Milk' };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockItem, ...updates }),
        });

        await updateItem('item-1', updates);

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(updates),
          })
        );
      });
    });

    describe('deleteItem', () => {
      it('deletes item with DELETE request', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => undefined,
        });

        await deleteItem('item-1');

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/items/item-1`,
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      it('resolves successfully on delete', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => undefined,
        });

        await expect(deleteItem('item-1')).resolves.toBeUndefined();
      });
    });
  });

  describe('Activities API', () => {
    describe('getActivities', () => {
      it('fetches all activities', async () => {
        const mockActivities = [mockActivity];
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockActivities,
        });

        const result = await getActivities();

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/activities`,
          expect.any(Object)
        );
        expect(result).toEqual(mockActivities);
      });
    });

    describe('logActivity', () => {
      it('logs activity with POST request', async () => {
        const newActivity = {
          itemId: 'item-2',
          itemName: 'Bread',
          type: 'REMOVE' as const,
          amount: 1,
          source: 'MANUAL' as const,
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...newActivity, id: 'activity-2', timestamp: '2026-02-27T11:00:00Z' }),
        });

        await logActivity(newActivity);

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/activities`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(newActivity),
          })
        );
      });
    });
  });

  describe('Receipt API', () => {
    describe('scanReceiptBackend', () => {
      it('scans receipt with base64 image', async () => {
        const base64Image = 'base64EncodedImageString';
        const mockResponse = {
          items: [
            { name: 'Milk', quantity: 2, unit: 'cartons', category: 'dairy' },
            { name: 'Bread', quantity: 1, unit: 'loaf', category: 'pantry' },
          ],
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await scanReceiptBackend(base64Image);

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/receipts/scan`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ image: base64Image }),
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it('returns extracted items', async () => {
        const mockItems = {
          items: [{ name: 'Eggs', quantity: 12, unit: 'units', category: 'dairy' }],
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems,
        });

        const result = await scanReceiptBackend('image');

        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('Eggs');
      });
    });

    describe('processScan', () => {
      it('processes scan results', async () => {
        const scanData = { items: [{ name: 'Milk', quantity: 2 }] };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        await processScan(scanData);

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/scan-receipt`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(scanData),
          })
        );
      });
    });

    describe('processUsage', () => {
      it('processes usage data', async () => {
        const usageData = { items: [{ name: 'Flour', quantityUsed: 2 }] };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        await processUsage(usageData);

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/visual-usage`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(usageData),
          })
        );
      });
    });
  });

  describe('Product Lookup API', () => {
    describe('getProductByBarcode', () => {
      it('fetches product by barcode', async () => {
        const mockProduct = {
          barcode: '123456789',
          name: 'Test Product',
          brand: 'Test Brand',
          category: 'pantry',
          image: 'https://example.com/image.jpg',
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: mockProduct,
            fromCache: true,
            cachedAt: '2026-02-27',
          }),
        });

        const result = await getProductByBarcode('123456789');

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/products/barcode/123456789`,
          expect.any(Object)
        );
        expect(result.product).toEqual(expect.objectContaining({
          barcode: '123456789',
          name: 'Test Product',
        }));
      });

      it('handles null product response', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ product: null }),
        });

        const result = await getProductByBarcode('999999999');

        expect(result.product).toBeNull();
      });

      it('transforms image_url to image', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: {
              barcode: '123',
              name: 'Test',
              image_url: 'https://example.com/img.jpg',
            },
          }),
        });

        const result = await getProductByBarcode('123');

        expect(result.product?.image).toBe('https://example.com/img.jpg');
      });

      it('transforms imageUrl to image', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: {
              barcode: '123',
              name: 'Test',
              imageUrl: 'https://example.com/img2.jpg',
            },
          }),
        });

        const result = await getProductByBarcode('123');

        expect(result.product?.image).toBe('https://example.com/img2.jpg');
      });

      it('transforms ingredients string to array', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: {
              barcode: '123',
              name: 'Test',
              ingredients: 'flour, sugar, eggs',
            },
          }),
        });

        const result = await getProductByBarcode('123');

        expect(result.product?.ingredients).toEqual(['flour', 'sugar', 'eggs']);
      });

      it('handles multiline ingredients', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: {
              barcode: '123',
              name: 'Test',
              ingredients: 'flour\nsugar\neggs',
            },
          }),
        });

        const result = await getProductByBarcode('123');

        expect(result.product?.ingredients).toEqual(['flour', 'sugar', 'eggs']);
      });

      it('sets source based on cache status', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: { barcode: '123', name: 'Test' },
            fromCache: true,
          }),
        });

        const result = await getProductByBarcode('123');

        expect(result.product?.source).toBe('cache');
      });

      it('sets source to stale when cachedAt is present', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: { barcode: '123', name: 'Test' },
            fromCache: true,
            cachedAt: '2026-02-27',
          }),
        });

        const result = await getProductByBarcode('123');

        expect(result.product?.source).toBe('stale');
      });

      it('maps info_last_synced to updatedAt', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            product: {
              barcode: '123',
              name: 'Test',
              info_last_synced: '2026-02-27T10:00:00Z',
            },
          }),
        });

        const result = await getProductByBarcode('123');

        expect(result.product?.updatedAt).toBe('2026-02-27T10:00:00Z');
      });
    });
  });

  describe('Subscription API', () => {
    describe('getTierInfo', () => {
      it('fetches tier info', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTierInfo,
        });

        const result = await getTierInfo();

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/subscription/tier`,
          expect.any(Object)
        );
        expect(result).toEqual(mockTierInfo);
      });

      it('returns tier with correct structure', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTierInfo,
        });

        const result = await getTierInfo();

        expect(result.tier).toBe('pro');
        expect(result.limits.maxItems).toBe(1000);
        expect(result.usage.currentItems).toBe(45);
      });
    });

    describe('createCheckoutSession', () => {
      it('creates checkout session with correct data', async () => {
        const checkoutData = {
          tier: 'pro' as const,
          billingInterval: 'month' as const,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sessionId: 'sess_123',
            url: 'https://checkout.stripe.com/test',
          }),
        });

        const result = await createCheckoutSession(checkoutData);

        expect(fetchMock).toHaveBeenCalledWith(
          `${API_URL}/api/subscription/checkout`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(checkoutData),
          })
        );
        expect(result.sessionId).toBe('sess_123');
        expect(result.url).toBe('https://checkout.stripe.com/test');
      });

      it('supports yearly billing interval', async () => {
        const checkoutData = {
          tier: 'family' as const,
          billingInterval: 'year' as const,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        };

        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sessionId: 'sess_456',
            url: 'https://checkout.stripe.com/yearly',
          }),
        });

        await createCheckoutSession(checkoutData);

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('year'),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(getItems()).rejects.toThrow('Network error');
    });

    it('handles JSON parse errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(getItems()).rejects.toThrow('Invalid JSON');
    });

    it('includes status and statusText in error message', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(getItems()).rejects.toThrow('API error: 403 Forbidden');
    });
  });

  describe('useSetupAuthToken', () => {
    it('is a hook function', () => {
      expect(typeof useSetupAuthToken).toBe('function');
    });
  });
});
