import 'server-only';

/**
 * In-pod LRU cache. Map preserves insertion order; on `get` we re-insert
 * to mark as recent, on overflow we evict the oldest.
 *
 * Tiny on purpose — node-lru-cache adds a dep we don't need at the access
 * patterns the registry has (a few k entries, small values). If we ever
 * want metrics/weights/disposers, swap in `lru-cache`.
 */
export class LRU<K, V> {
  private readonly map = new Map<K, { value: V; expiresAt: number }>();

  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.map.size > this.capacity) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
