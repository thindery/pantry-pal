import { describe, expect, it } from 'vitest';
import { normalizeBarcodeLookupResponse } from '../services/apiService';

describe('normalizeBarcodeLookupResponse', () => {
  it('normalizes cached Postgres product payloads', () => {
    const result = normalizeBarcodeLookupResponse({
      success: true,
      cached: true,
      product: {
        barcode: '012345678905',
        name: 'Nerds Gummy Clusters',
        source: 'openfoodfacts',
        infoLastSynced: '2026-07-10T12:00:00Z',
        imageUrl: 'https://example.com/nerds.jpg',
      },
    });

    expect(result.fromCache).toBe(true);
    expect(result.cachedAt).toBe('2026-07-10T12:00:00Z');
    expect(result.product?.image).toBe('https://example.com/nerds.jpg');
    expect(result.product?.infoLastSynced).toBe('2026-07-10T12:00:00Z');
  });

  it('parses string ingredients into an array', () => {
    const result = normalizeBarcodeLookupResponse({
      success: true,
      cached: false,
      product: {
        barcode: '012345678905',
        name: 'Test Product',
        ingredients: 'sugar, corn syrup, gelatin',
      },
    });

    expect(result.product?.ingredients).toEqual(['sugar', 'corn syrup', 'gelatin']);
  });

  it('returns null product when lookup has no product', () => {
    const result = normalizeBarcodeLookupResponse({
      success: false,
      cached: false,
    });

    expect(result.product).toBeNull();
    expect(result.fromCache).toBe(false);
  });
});