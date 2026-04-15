import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the environment
vi.stubGlobal('import', {
  meta: {
    env: { VITE_GEMINI_API_KEY: 'test-api-key-123' }
  }
});

// Mock @google/genai
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    mockGenerateContent, // Export for tests
    Type: {
      ARRAY: 'array',
      OBJECT: 'object',
      STRING: 'string',
      NUMBER: 'number',
    },
  };
});

// Mock apiService
vi.mock('../services/apiService', () => ({
  processScan: vi.fn().mockResolvedValue(undefined),
  processUsage: vi.fn().mockResolvedValue(undefined),
}));

// Import mocked module to get access to mockGenerateContent
import { GoogleGenAI } from '@google/genai';
import * as apiService from '../services/apiService';

describe('geminiService', () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  
  // Dynamically import geminiService to get fresh instance with mocks
  let scanReceipt: typeof import('../services/geminiService').scanReceipt;
  let analyzeUsage: typeof import('../services/geminiService').analyzeUsage;

  const mockScanResults = [
    { name: 'Milk', quantity: 2, unit: 'cartons', category: 'dairy' },
    { name: 'Bread', quantity: 1, unit: 'loaf', category: 'pantry' },
  ];

  const mockUsageResults = [
    { name: 'Flour', quantityUsed: 2 },
    { name: 'Sugar', quantityUsed: 0.5 },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create fresh mock for generateContent
    mockGenerateContent = vi.fn();
    
    // Reset GoogleGenAI mock implementation
    (GoogleGenAI as unknown as { mockImplementation: (impl: () => { models: { generateContent: typeof mockGenerateContent } }) => void }).mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));
    
    // Setup console spies
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Import fresh module
    const geminiModule = await import('../services/geminiService');
    scanReceipt = geminiModule.scanReceipt;
    analyzeUsage = geminiModule.analyzeUsage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scanReceipt', () => {
    it('successfully scans receipt and returns items', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockScanResults),
      });

      const result = await scanReceipt('base64Image');

      expect(result).toEqual(mockScanResults);
    });

    it('calls processScan to log results to backend', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockScanResults),
      });

      await scanReceipt('base64Image');

      expect(apiService.processScan).toHaveBeenCalledWith(mockScanResults);
    });

    it('continues even if processScan fails', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockScanResults),
      });
      vi.mocked(apiService.processScan).mockRejectedValueOnce(new Error('Backend error'));

      const result = await scanReceipt('base64Image');

      expect(result).toEqual(mockScanResults);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to log scan to backend:',
        expect.any(Error)
      );
    });

    it('parses markdown-wrapped JSON', async () => {
      const markdownJson = `[\n  {"name": "Milk", "quantity": 2}\n]`;
      mockGenerateContent.mockResolvedValueOnce({
        text: markdownJson,
      });

      const result = await scanReceipt('base64Image');

      expect(result).toEqual([{ name: 'Milk', quantity: 2 }]);
    });

    it('throws error on empty response', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '' });

      await expect(scanReceipt('base64Image')).rejects.toThrow('Empty response from Gemini API');
    });

    it('throws error when response is not an array', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ not: 'an array' }),
      });

      await expect(scanReceipt('base64Image')).rejects.toThrow('Response is not an array');
    });

    it('throws error for invalid JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'not valid json',
      });

      await expect(scanReceipt('base64Image')).rejects.toThrow(
        'Failed to parse Gemini response as JSON'
      );
    });

    it('logs errors when API fails', async () => {
      const apiError = new Error('Gemini API error');
      mockGenerateContent.mockRejectedValueOnce(apiError);

      await expect(scanReceipt('base64Image')).rejects.toThrow(apiError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'scanReceipt error:',
        expect.any(Error)
      );
    });

    it('handles items without optional fields', async () => {
      const resultsWithOptional = [
        { name: 'Generic Item', quantity: 1 },
      ];
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(resultsWithOptional),
      });

      const result = await scanReceipt('base64Image');

      expect(result).toEqual(resultsWithOptional);
    });

    it('handles complex receipt with many items', async () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        name: `Item ${i}`,
        quantity: i + 1,
        unit: 'units',
        category: 'pantry',
      }));

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(manyItems),
      });

      const result = await scanReceipt('base64Image');

      expect(result).toHaveLength(20);
      expect(result[0].name).toBe('Item 0');
      expect(result[19].name).toBe('Item 19');
    });
  });

  describe('analyzeUsage', () => {
    it('successfully analyzes usage image and returns items', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockUsageResults),
      });

      const result = await analyzeUsage('base64Image');

      expect(result).toEqual(mockUsageResults);
    });

    it('calls processUsage to log results to backend', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockUsageResults),
      });

      await analyzeUsage('base64Image');

      expect(apiService.processUsage).toHaveBeenCalledWith(mockUsageResults);
    });

    it('returns empty array for invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'not valid json',
      });

      const result = await analyzeUsage('base64Image');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse usage JSON', expect.any(Error));
    });

    it('returns empty array for null response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: null,
      });

      const result = await analyzeUsage('base64Image');

      expect(result).toEqual([]);
    });

    it('returns empty array for undefined response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: undefined,
      });

      const result = await analyzeUsage('base64Image');

      expect(result).toEqual([]);
    });

    it('handles items with zero quantity', async () => {
      const resultsWithZero = [
        { name: 'Unused Item', quantityUsed: 0 },
        { name: 'Partial Item', quantityUsed: 1.5 },
      ];

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(resultsWithZero),
      });

      const result = await analyzeUsage('base64Image');

      expect(result).toEqual(resultsWithZero);
    });

    it('handles fractional quantities', async () => {
      const fractionalResults = [
        { name: 'Flour', quantityUsed: 0.5 },
        { name: 'Sugar', quantityUsed: 0.25 },
      ];

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(fractionalResults),
      });

      const result = await analyzeUsage('base64Image');

      expect(result[0].quantityUsed).toBe(0.5);
      expect(result[1].quantityUsed).toBe(0.25);
    });

    it('continues processing even if backend logging fails', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockUsageResults),
      });
      vi.mocked(apiService.processUsage).mockRejectedValueOnce(new Error('Backend down'));

      const result = await analyzeUsage('base64Image');

      expect(result).toEqual(mockUsageResults);
    });
  });

  describe('Error Scenarios', () => {
    it('handles network errors in scanReceipt', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Network request failed'));

      await expect(scanReceipt('base64Image')).rejects.toThrow('Network request failed');
    });

    it('handles network errors in analyzeUsage by returning empty array', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Network request failed'));

      const result = await analyzeUsage('base64Image');
      expect(result).toEqual([]);
    });

    it('handles timeout errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(scanReceipt('base64Image')).rejects.toThrow('Request timeout');
    });

    it('handles API rate limit errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error('Resource has been exhausted (e.g. check quota).')
      );

      await expect(scanReceipt('base64Image')).rejects.toThrow('Resource has been exhausted');
    });
  });
});
