// NEXHIRE Unified API Navigation Client Caching Store

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};

// Max age before data is considered stale (e.g. 10 minutes)
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Retrieves a value from the navigation cache if present and not stale.
 * Adds console logging as required to track cache behaviors.
 */
export function getCachedValue(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): any | null {
  console.log(`[Navigation API Fetch Verification] Checking GET cache target key: "${key}"`);
  const entry = cache[key];
  if (!entry) {
    console.log(`[Navigation API Fetch CACHE MISS] Cache miss for: "${key}". Performing fresh server request.`);
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > maxAgeMs) {
    console.log(`[Navigation API Fetch CACHE STALE] Cache entry for "${key}" is stale. Age: ${(age / 1000).toFixed(1)}s (Max: ${maxAgeMs / 1000}s). Refetching.`);
    return null;
  }

  console.log(`[Navigation API Fetch CACHE HIT] Reusing loaded state for: "${key}". Age: ${(age / 1000).toFixed(1)}s. Instant render triggered.`);
  return entry.data;
}

/**
 * Saves a fresh value inside the cache mapped to the given key.
 */
export function setCachedValue(key: string, data: any): void {
  console.log(`[Navigation API Fetch CACHE WRITE] Saving fresh retrieved data to cache for key: "${key}"`);
  cache[key] = {
    data,
    timestamp: Date.now()
  };
}

/**
 * Invalidates a specific key.
 */
export function clearCachedValue(key: string): void {
  console.log(`[Navigation API Fetch CACHE INVALIDATE] Removing cache mapping to: "${key}"`);
  delete cache[key];
}

/**
 * Invalidates any cache key starting with a matching prefix.
 */
export function clearCachedValueWithPrefix(prefix: string): void {
  console.log(`[Navigation API Fetch CACHE INVALIDATE] Purging any matching prefixes for: "${prefix}"`);
  Object.keys(cache).forEach(key => {
    if (key.startsWith(prefix)) {
      console.log(`[Navigation API Fetch CACHE INVALIDATE] Purged: "${key}"`);
      delete cache[key];
    }
  });
}

/**
 * Fully clears all entries in the cache.
 */
export function clearAllCache(): void {
  console.log("[Navigation API Fetch CACHE CLEARALL] Complete flush executed.");
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
}
