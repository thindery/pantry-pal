import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PantryItem, Activity, ActivityType, TierInfo, ScanResult } from '../types';

const mockFetch = vi.fn();
const API_URL = 'http://localhost:3001';

describe('API Contract Tests', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pantry Items API', () => {
    describe('createItem', () => {
      it('should send correct request payload for creating item', async () => {
        const createItem = async (item: Omit<PantryItem, 'id' | 'lastUpdated'>): Promise<PantryItem> => {
          const response = await fetch(`${API_URL}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const newItem = {
          name: 'Organic Milk',
          quantity: 2,
          unit: 'bottles',
          category: 'dairy',
        };

        const mockResponse: PantryItem = {
          ...newItem,
          id: 'item-123',
          lastUpdated: new Date().toISOString(),
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await createItem(newItem);

        // Validate request payload structure
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe(`${API_URL}/api/items`);
        expect(options.method).toBe('POST');
        
        const requestBody = JSON.parse(options.body);
        expect(requestBody).toMatchObject({
          name: expect.any(String),
          quantity: expect.any(Number),
          unit: expect.any(String),
          category: expect.any(String),
        });
        expect(requestBody.name).toBe('Organic Milk');
        expect(requestBody.quantity).toBe(2);
        expect(requestBody.unit).toBe('bottles');
        expect(requestBody.category).toBe('dairy');
        
        // Verify no extra ID or lastUpdated in request
        expect(requestBody.id).toBeUndefined();
        expect(requestBody.lastUpdated).toBeUndefined();
      });

      it('should handle wrapped response from backend', async () => {
        const createItem = async (item: Omit<PantryItem, 'id' | 'lastUpdated'>): Promise<any> => {
          const response = await fetch(`${API_URL}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const newItem = {
          name: 'Eggs',
          quantity: 12,
          unit: 'units',
          category: 'dairy',
        };

        // Backend wraps response in { data, success, meta }
        const wrappedResponse = {
          data: {
            ...newItem,
            id: 'item-456',
            lastUpdated: new Date().toISOString(),
          },
          success: true,
          meta: {
            requestId: 'req-123',
            timestamp: new Date().toISOString(),
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(wrappedResponse),
        });

        const result = await createItem(newItem);

        expect(result.data).toBeDefined();
        expect(result.data.id).toBe('item-456');
        expect(result.success).toBe(true);
      });

      it('should validate response contains required PantryItem fields', async () => {
        const createItem = async (item: Omit<PantryItem, 'id' | 'lastUpdated'>): Promise<PantryItem> => {
          const response = await fetch(`${API_URL}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'valid-id',
            name: 'Bread',
            quantity: 1,
            unit: 'loaf',
            category: 'pantry',
            lastUpdated: new Date().toISOString(),
          }),
        });

        const result = await createItem({
          name: 'Bread',
          quantity: 1,
          unit: 'loaf',
          category: 'pantry',
        });

        // Validate required fields exist in response
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('quantity');
        expect(result).toHaveProperty('unit');
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('lastUpdated');
        
        // Validate types
        expect(typeof result.id).toBe('string');
        expect(typeof result.name).toBe('string');
        expect(typeof result.quantity).toBe('number');
        expect(typeof result.unit).toBe('string');
        expect(typeof result.category).toBe('string');
        expect(typeof result.lastUpdated).toBe('string');
      });

      it('should handle validation error response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        });

        const createItem = async (item: Omit<PantryItem, 'id' | 'lastUpdated'>): Promise<PantryItem> => {
          const response = await fetch(`${API_URL}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
          return response.json();
        };

        await expect(createItem({
          name: '',
          quantity: -1,
          unit: 'units',
          category: 'invalid-category',
        })).rejects.toThrow('API error: 400 Bad Request');
      });
    });

    describe('updateItem', () => {
      it('should send correct partial update payload', async () => {
        const updateItem = async (id: string, updates: Partial<PantryItem>): Promise<PantryItem> => {
          const response = await fetch(`${API_URL}/api/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'item-1',
            name: 'Updated Milk',
            quantity: 3,
            unit: 'bottles',
            category: 'dairy',
            lastUpdated: new Date().toISOString(),
          }),
        });

        await updateItem('item-1', { name: 'Updated Milk', quantity: 3 });

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe(`${API_URL}/api/items/item-1`);
        expect(options.method).toBe('PUT');
        
        const requestBody = JSON.parse(options.body);
        expect(requestBody).toEqual({
          name: 'Updated Milk',
          quantity: 3,
        });
        // Only changed fields should be in the payload
        expect(requestBody.id).toBeUndefined();
        expect(requestBody.category).toBeUndefined();
      });

      it('should handle quantity adjustment payload', async () => {
        const updateItem = async (id: string, updates: Partial<PantryItem>): Promise<PantryItem> => {
          const response = await fetch(`${API_URL}/api/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        // Setting to zero (out of stock)
        await updateItem('item-1', { quantity: 0 });

        const [, options] = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(options.body);
        expect(requestBody.quantity).toBe(0);
      });
    });

    describe('getItems', () => {
      it('should receive array of PantryItems', async () => {
        const getItems = async (): Promise<PantryItem[]> => {
          const response = await fetch(`${API_URL}/api/items`);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const mockItems: PantryItem[] = [
          {
            id: 'item-1',
            name: 'Milk',
            quantity: 2,
            unit: 'bottles',
            category: 'dairy',
            lastUpdated: new Date().toISOString(),
          },
          {
            id: 'item-2',
            name: 'Bread',
            quantity: 1,
            unit: 'loaf',
            category: 'pantry',
            lastUpdated: new Date().toISOString(),
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockItems),
        });

        const result = await getItems();

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        
        // Check each item has required fields
        result.forEach(item => {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('quantity');
          expect(item).toHaveProperty('unit');
          expect(item).toHaveProperty('category');
          expect(item).toHaveProperty('lastUpdated');
        });
      });

      it('should handle wrapped items response', async () => {
        const getItems = async (): Promise<PantryItem[]> => {
          const response = await fetch(`${API_URL}/api/items`);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          // Handle both direct array and wrapped { items: [...] } response
          return Array.isArray(data) ? data : data?.items || [];
        };

        const wrappedResponse = {
          items: [
            {
              id: 'item-1',
              name: 'Milk',
              quantity: 2,
              unit: 'bottles',
              category: 'dairy',
              lastUpdated: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(wrappedResponse),
        });

        const result = await getItems();

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Milk');
      });
    });
  });

  describe('Activities API', () => {
    describe('logActivity', () => {
      it('should send correct Activity payload structure', async () => {
        const logActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> => {
          const response = await fetch(`${API_URL}/api/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activity),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const activityData = {
          itemId: 'item-123',
          itemName: 'Milk',
          type: 'ADD' as ActivityType,
          amount: 2,
          source: 'MANUAL' as const,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...activityData,
            id: 'act-1',
            timestamp: new Date().toISOString(),
          }),
        });

        await logActivity(activityData);

        const [, options] = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(options.body);

        // Validate Activity payload structure
        expect(requestBody).toMatchObject({
          itemId: expect.any(String),
          itemName: expect.any(String),
          type: expect.stringMatching(/^(ADD|REMOVE|ADJUST)$/),
          amount: expect.any(Number),
          source: expect.stringMatching(/^(MANUAL|RECEIPT_SCAN|VISUAL_USAGE)$/),
        });

        // Verify ID and timestamp are NOT in request (server generates these)
        expect(requestBody.id).toBeUndefined();
        expect(requestBody.timestamp).toBeUndefined();
      });

      it('should handle all valid ActivityType values', async () => {
        const logActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> => {
          const response = await fetch(`${API_URL}/api/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activity),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const types: ActivityType[] = ['ADD', 'REMOVE', 'ADJUST'];
        
        for (const type of types) {
          mockFetch.mockClear();
          
          const activityData = {
            itemId: 'item-1',
            itemName: 'Test',
            type,
            amount: 1,
            source: 'MANUAL' as const,
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ...activityData,
              id: `act-${type}`,
              timestamp: new Date().toISOString(),
            }),
          });

          await logActivity(activityData);

          const [, options] = mockFetch.mock.calls[0];
          const requestBody = JSON.parse(options.body);
          expect(requestBody.type).toBe(type);
        }
      });

      it('should handle all valid source values', async () => {
        const logActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> => {
          const response = await fetch(`${API_URL}/api/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activity),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const sources: Activity['source'][] = ['MANUAL', 'RECEIPT_SCAN', 'VISUAL_USAGE'];
        
        for (const source of sources) {
          mockFetch.mockClear();
          
          const activityData = {
            itemId: 'item-1',
            itemName: 'Test',
            type: 'ADD' as ActivityType,
            amount: 1,
            source,
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ...activityData,
              id: `act-${source}`,
              timestamp: new Date().toISOString(),
            }),
          });

          await logActivity(activityData);

          const [, options] = mockFetch.mock.calls[0];
          const requestBody = JSON.parse(options.body);
          expect(requestBody.source).toBe(source);
        }
      });

      it('should receive Activity response with generated id and timestamp', async () => {
        const logActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> => {
          const response = await fetch(`${API_URL}/api/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activity),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'act-abc123',
            itemId: 'item-1',
            itemName: 'Milk',
            type: 'ADD',
            amount: 2,
            timestamp: '2026-02-10T12:00:00Z',
            source: 'MANUAL',
          }),
        });

        const result = await logActivity({
          itemId: 'item-1',
          itemName: 'Milk',
          type: 'ADD',
          amount: 2,
          source: 'MANUAL',
        });

        expect(result.id).toBeDefined();
        expect(result.id).not.toBe('');
        expect(result.timestamp).toBeDefined();
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date format
      });
    });

    describe('getActivities', () => {
      it('should return array of Activities', async () => {
        const getActivities = async (): Promise<Activity[]> => {
          const response = await fetch(`${API_URL}/api/activities`);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return Array.isArray(data) ? data : data?.activities || [];
        };

        const mockActivities: Activity[] = [
          {
            id: 'act-1',
            itemId: 'item-1',
            itemName: 'Milk',
            type: 'ADD',
            amount: 2,
            timestamp: new Date().toISOString(),
            source: 'MANUAL',
          },
          {
            id: 'act-2',
            itemId: 'item-1',
            itemName: 'Milk',
            type: 'REMOVE',
            amount: 1,
            timestamp: new Date().toISOString(),
            source: 'MANUAL',
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivities),
        });

        const result = await getActivities();

        expect(Array.isArray(result)).toBe(true);
        result.forEach(activity => {
          expect(activity).toHaveProperty('id');
          expect(activity).toHaveProperty('itemId');
          expect(activity).toHaveProperty('itemName');
          expect(activity).toHaveProperty('type');
          expect(activity).toHaveProperty('amount');
          expect(activity).toHaveProperty('timestamp');
          expect(activity).toHaveProperty('source');
        });
      });
    });
  });

  describe('Subscription API', () => {
    describe('getTierInfo', () => {
      it('should return TierInfo structure', async () => {
        const getTierInfo = async (): Promise<TierInfo> => {
          const response = await fetch(`${API_URL}/api/subscription/tier`);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const mockTierInfo: TierInfo = {
          tier: 'free',
          limits: {
            maxItems: 50,
            receiptScansPerMonth: 5,
            aiCallsPerMonth: 10,
            voiceAssistant: false,
            multiDevice: false,
            sharedInventory: false,
            maxFamilyMembers: 1,
          },
          usage: {
            currentItems: 25,
            receiptScansThisMonth: 2,
            aiCallsThisMonth: 5,
            voiceSessionsThisMonth: 0,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTierInfo),
        });

        const result = await getTierInfo();

        expect(result.tier).toMatch(/^(free|pro|family)$/);
        expect(result.limits).toBeDefined();
        expect(result.limits.maxItems).toBeGreaterThanOrEqual(0);
        expect(result.usage).toBeDefined();
        expect(result.usage.currentItems).toBeGreaterThanOrEqual(0);
      });
    });

    describe('createCheckoutSession', () => {
      it('should send correct checkout payload', async () => {
        const createCheckoutSession = async (data: {
          tier: 'pro' | 'family';
          billingInterval: 'month' | 'year';
          successUrl: string;
          cancelUrl: string;
        }): Promise<{ sessionId: string; url: string }> => {
          const response = await fetch(`${API_URL}/api/subscription/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const checkoutData = {
          tier: 'pro' as const,
          billingInterval: 'month' as const,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sessionId: 'session_abc123',
            url: 'https://checkout.stripe.com/pay/session_abc123',
          }),
        });

        await createCheckoutSession(checkoutData);

        const [, options] = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(options.body);

        expect(requestBody).toMatchObject({
          tier: expect.stringMatching(/^(pro|family)$/),
          billingInterval: expect.stringMatching(/^(month|year)$/),
          successUrl: expect.any(String),
          cancelUrl: expect.any(String),
        });
      });
    });
  });

  describe('Scan API', () => {
    describe('processScan', () => {
      it('should send scan data with correct payload', async () => {
        const processScan = async (scanData: any): Promise<{ items: ScanResult[] }> => {
          const response = await fetch(`${API_URL}/api/scan-receipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scanData),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.json();
        };

        const scanData = {
          image: 'base64encodedstring',
          mimeType: 'image/jpeg',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [
              { name: 'Milk', quantity: 2, unit: 'bottles', category: 'dairy' },
              { name: 'Eggs', quantity: 12, unit: 'units', category: 'dairy' },
            ],
          }),
        });

        const result = await processScan(scanData);

        const [, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual(scanData);
        
        expect(Array.isArray(result.items)).toBe(true);
        result.items.forEach(item => {
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('quantity');
        });
      });
    });
  });

  describe('Error Response Contract', () => {
    it('should handle standard API error format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
      });

      const fetchApi = async (): Promise<any> => {
        const response = await fetch(`${API_URL}/api/items`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      };

      await expect(fetchApi()).rejects.toThrow(/API error: 422/);
    });

    it('should handle 404 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const getItem = async (id: string): Promise<PantryItem> => {
        const response = await fetch(`${API_URL}/api/items/${id}`);
        if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
        return response.json();
      };

      await expect(getItem('nonexistent-id')).rejects.toThrow('API error: 404 Not Found');
    });

    it('should handle 401 unauthorized responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const getItems = async (): Promise<PantryItem[]> => {
        const response = await fetch(`${API_URL}/api/items`);
        if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
        return response.json();
      };

      await expect(getItems()).rejects.toThrow('API error: 401 Unauthorized');
    });
  });
});
