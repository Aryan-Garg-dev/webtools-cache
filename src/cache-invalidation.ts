import { getRedisClient } from "./redis-client";

export async function invalidateCacheByPrefix(prefix: string) {
  console.log("Invalidating:", `${prefix}:*`)
  const redis = getRedisClient();
  const pattern = `${prefix}:*`;
  const keys = await redis.keys(pattern);
  console.log("Found keys to delete:", keys);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}