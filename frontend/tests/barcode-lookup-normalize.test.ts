import { describe, expect, it } from 'vitest';
import { normalizeBarcodeLookupResponse } from '../services/apiService';

describe('normalizeBarcodeLookupResponse', () => {
  it('maps fresh Postgres cache to Cached badge fields', () => {
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
    expect(result.product?.source).toBe('cache');
    expect(result.product?.image).toBe('https://example.com/nerds.jpg');
  });

  it('maps stale cache responses to Stale badge fields', () => {
    const result = normalizeBarcodeLookupResponse({
      success: true,
      cached: true,
      stale: true,
      product: {
        barcode: '012345678905',
        name: 'Nerds Gummy Clusters',
        source: 'openfoodfacts',
        infoLastSynced: '2026-06-01T12:00:00Z',
      },
    });

    expect(result.product?.source).toBe('stale');
    expect(result.cachedAt).toBe('2026-06-01T12:00:00Z');
  });

  it('maps live Open Food Facts lookups to Live badge fields', () => {
    const result = normalizeBarcodeLookupResponse({
      success: true,
      cached: false,
      product: {
        barcode: '012345678905',
        name: 'Nerds Gummy Clusters',
        source: 'openfoodfacts',
        infoLastSynced: '2026-07-11T12:00:00Z',
      },
    });

    expect(result.fromCache).toBe(false);
    expect(result.product?.source).toBe('live');
  });
});