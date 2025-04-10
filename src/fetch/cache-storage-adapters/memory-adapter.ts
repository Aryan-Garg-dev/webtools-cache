import type { CacheStorageAdapter } from "../types";


export const createMemoryAdapter = (): CacheStorageAdapter => {
  const memoryStore = new Map<string, { value: string; expiresAt: number }>();
  return {
    async get(key) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttl = 60) {
      memoryStore.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });
    },
    async delete(key) {
      memoryStore.delete(key);
    },
    async clear() {
      memoryStore.clear();
    },
  }
};
