import type { CacheOptions, AsyncFunc, CacheEnhanced } from "./types";
import { getRedisClient } from "./redis-client";
import superjson from "superjson"
import stringify from "fast-json-stable-stringify";

function withCache<TArgs extends any[] = any[], TResult = any>(
  fn: AsyncFunc<TArgs, TResult>,
  { ttl = 60, prefix = "" }: CacheOptions = {}
): CacheEnhanced<TArgs, TResult> {
  const redis = getRedisClient();

  const wrapped = async (...args: TArgs): Promise<TResult> => {
    const cacheKey = `${prefix}:${stringify(args)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return superjson.parse(cached);

    const result = await fn(...args);
    await redis.set(cacheKey, superjson.stringify(result), "EX", ttl);
    return result;
  };

  (wrapped as CacheEnhanced<TArgs, TResult>).invalidate = async () => {
    const keys = await redis.keys(`${prefix}:*`);
    if (keys.length > 0) await redis.del(...keys);
  };

  return wrapped as CacheEnhanced<TArgs, TResult>;
}

export { withCache };