import type Redis from "ioredis"
import type { CacheStorageAdapter } from "../types"
import { getRedisClient } from "../../redis-client"
import { randomUUID } from "crypto"

export const createRedisAdapter = (options?: { prefix?: string }): CacheStorageAdapter => {
  const redis = getRedisClient();
  const instancePrefix = options?.prefix ?? randomUUID();
  const keyResolver = (key: string) => `${instancePrefix}:${key}`;
  return {
    async get(key: string) {
      return await redis.get(keyResolver(key));
    },
    async set(key, value, ttl = 60){
      await redis.set(keyResolver(key), value, "EX", ttl);
    },
    async delete(key){
      await redis.del(keyResolver(key));
    },
    async clear() {
      const keys = await redis.keys(keyResolver("*"));
      if (keys.length > 0) await redis.del(...keys);
    },
    prefix: instancePrefix
  }
}