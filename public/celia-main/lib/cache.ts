const store = new Map<string, { value: unknown; expiresAt: number }>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * In-process TTL cache with request coalescing. Cached values are kept as
 * native JS objects (no serialization), so Dates and Maps survive round trips.
 * Safe to call from both server components and route handlers.
 */
export function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = store.get(key);
  if (entry && entry.expiresAt > now) {
    return Promise.resolve(entry.value as T);
  }

  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCached(...keys: string[]): void {
  for (const key of keys) {
    store.delete(key);
  }
}
