// TASK-033: CLI Performance Optimizations
import { performance } from 'perf_hooks';

// Optimized batch processing with chunked iterations
export class BatchProcessor {
  private chunkSize = 100;
  
  async processBatchAsync<T, R>(
    items: T[], 
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    const start = performance.now();
    
    for (let i = 0; i < items.length; i += this.chunkSize) {
      const chunk = items.slice(i, i + this.chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(item => processor(item))
      );
      results.push(...chunkResults);
      
      // Yield to event loop to prevent blocking
      await new Promise(resolve => setImmediate(resolve));
    }
    
    console.log(`Processed ${items.length} items in ${(performance.now() - start).toFixed(2)}ms`);
    return results;
  }
}

export const cachedFetch = <T>(
  fn: () => Promise<T>,
  ttlMs: number = 60000
): (() => Promise<T>) => {
  let cache: T | null = null;
  let timestamp = 0;
  
  return async () => {
    const now = Date.now();
    if (!cache || (now - timestamp) > ttlMs) {
      cache = await fn();
      timestamp = now;
    }
    return cache;
  };
};
