import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Activity, ActivityType } from '../types';

// Mock the global fetch
const mockFetch = vi.fn();

describe('ActivityService', () => {
  const API_URL = 'http://localhost:3001';

  // Activity service functions (mirroring apiService.ts)
  const logActivity = async (
    activity: Omit<Activity, 'id' | 'timestamp'>,
    getToken?: () => Promise<string | null>
  ): Promise<Activity> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (getToken) {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  const getActivities = async (getToken?: () => Promise<string | null>): Promise<Activity[]> => {
    const headers: Record<string, string> = {};

    if (getToken) {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_URL}/api/activities`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logActivity', () => {
    it('should call API with correct endpoint and method', async () => {
      const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
        itemId: 'item-123',
        itemName: 'Milk',
        type: 'ADD' as ActivityType,
        amount: 2,
        source: 'MANUAL',
      };

      const mockResponse: Activity = {
        ...mockActivity,
        id: 'act-456',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await logActivity(mockActivity);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/activities`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockActivity),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include auth token when provided', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('test-token-123');
      const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
        itemId: 'item-123',
        itemName: 'Milk',
        type: 'ADD' as ActivityType,
        amount: 2,
        source: 'MANUAL',
      };

      const mockResponse: Activity = {
        ...mockActivity,
        id: 'act-456',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await logActivity(mockActivity, mockGetToken);

      expect(mockGetToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123',
          },
        })
      );
    });

    it('should not include auth header when token is null', async () => {
      const mockGetToken = vi.fn().mockResolvedValue(null);
      const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
        itemId: 'item-123',
        itemName: 'Milk',
        type: 'ADD' as ActivityType,
        amount: 2,
        source: 'MANUAL',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await logActivity(mockActivity, mockGetToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors', async () => {
      const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
        itemId: 'item-123',
        itemName: 'Milk',
        type: 'ADD' as ActivityType,
        amount: 2,
        source: 'MANUAL',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(logActivity(mockActivity)).rejects.toThrow('API error: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
        itemId: 'item-123',
        itemName: 'Milk',
        type: 'ADD' as ActivityType,
        amount: 2,
        source: 'MANUAL',
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(logActivity(mockActivity)).rejects.toThrow('Network error');
    });

    describe('itemId handling', () => {
      it('should correctly pass itemId in request body', async () => {
        const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
          itemId: 'test-item-id-abc123',
          itemName: 'Eggs',
          type: 'REMOVE' as ActivityType,
          amount: 6,
          source: 'RECEIPT_SCAN',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockActivity,
            id: 'act-789',
            timestamp: new Date().toISOString(),
          }),
        });

        await logActivity(mockActivity);

        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.itemId).toBe('test-item-id-abc123');
        expect(requestBody.itemName).toBe('Eggs');
        expect(requestBody.type).toBe('REMOVE');
        expect(requestBody.amount).toBe(6);
        expect(requestBody.source).toBe('RECEIPT_SCAN');
      });

      it('should handle different activity types with correct itemId', async () => {
        const testCases: Array<{ type: ActivityType; itemId: string }> = [
          { type: 'ADD', itemId: 'add-item-1' },
          { type: 'REMOVE', itemId: 'remove-item-1' },
          { type: 'ADJUST', itemId: 'adjust-item-1' },
        ];

        for (const testCase of testCases) {
          mockFetch.mockClear();
          
          const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
            itemId: testCase.itemId,
            itemName: 'Test Item',
            type: testCase.type,
            amount: 1,
            source: 'MANUAL',
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ...mockActivity,
              id: `act-${testCase.type}`,
              timestamp: new Date().toISOString(),
            }),
          });

          await logActivity(mockActivity);

          const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
          expect(requestBody.itemId).toBe(testCase.itemId);
          expect(requestBody.type).toBe(testCase.type);
        }
      });

      it('should handle different sources with correct itemId', async () => {
        const sources: Array<Activity['source']> = ['MANUAL', 'RECEIPT_SCAN', 'VISUAL_USAGE'];
        const itemId = 'multi-source-item-123';

        for (const source of sources) {
          mockFetch.mockClear();
          
          const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
            itemId,
            itemName: 'Test Item',
            type: 'ADD',
            amount: 1,
            source,
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ...mockActivity,
              id: `act-${source}`,
              timestamp: new Date().toISOString(),
            }),
          });

          await logActivity(mockActivity);

          const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
          expect(requestBody.itemId).toBe(itemId);
          expect(requestBody.source).toBe(source);
        }
      });

      it('should handle itemId with special characters', async () => {
        const specialItemIds = [
          'item-with-dashes-123',
          'item_with_underscores',
          'Item.With.Dots',
          'item:colon:separated',
          'uuid-style-550e8400-e29b-41d4-a716-446655440000',
        ];

        for (const itemId of specialItemIds) {
          mockFetch.mockClear();
          
          const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
            itemId,
            itemName: 'Test Item',
            type: 'ADD',
            amount: 1,
            source: 'MANUAL',
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ...mockActivity,
              id: 'act-123',
              timestamp: new Date().toISOString(),
            }),
          });

          await logActivity(mockActivity);

          const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
          expect(requestBody.itemId).toBe(itemId);
        }
      });
    });

    describe('amount handling', () => {
      it('should handle positive amounts for ADD', async () => {
        const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
          itemId: 'item-1',
          itemName: 'Flour',
          type: 'ADD',
          amount: 2.5,
          source: 'MANUAL',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockActivity,
            id: 'act-1',
            timestamp: new Date().toISOString(),
          }),
        });

        await logActivity(mockActivity);

        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.amount).toBe(2.5);
      });

      it('should handle positive amounts for REMOVE (backend interprets type)', async () => {
        const mockActivity: Omit<Activity, 'id' | 'timestamp'> = {
          itemId: 'item-1',
          itemName: 'Eggs',
          type: 'REMOVE',
          amount: 6,
          source: 'MANUAL',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockActivity,
            id: 'act-1',
            timestamp: new Date().toISOString(),
          }),
        });

        await logActivity(mockActivity);

        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.amount).toBe(6);
        expect(requestBody.type).toBe('REMOVE');
      });
    });
  });

  describe('getActivities', () => {
    it('should fetch activities from API', async () => {
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
          itemId: 'item-2',
          itemName: 'Eggs',
          type: 'REMOVE',
          amount: 6,
          timestamp: new Date().toISOString(),
          source: 'RECEIPT_SCAN',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities),
      });

      const result = await getActivities();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/api/activities`,
        expect.objectContaining({
          headers: {},
        })
      );
      expect(result).toEqual(mockActivities);
    });

    it('should include auth token when provided', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getActivities(mockGetToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
          },
        })
      );
    });

    it('should return empty array when no activities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await getActivities();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(getActivities()).rejects.toThrow('API error: 401 Unauthorized');
    });
  });
});
