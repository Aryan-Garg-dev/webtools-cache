import { getRedisClient } from "./redis-client";

export async function invalidateCacheByPrefix(prefix: string) {
  const redis = getRedisClient();
  const pattern = `${prefix}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}