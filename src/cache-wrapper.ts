import type { CacheOptions, AsyncMethod } from "./types";
import { getRedisClient } from "@cache/redis-client";
import superjson from "superjson"
import stringify from "fast-json-stable-stringify";

function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  { ttl = 60, prefix = "" }: CacheOptions = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const redis = getRedisClient();
    const cacheKey = `${prefix}:${stringify(args)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return superjson.parse(cached);

    const result = await fn(...args);
    await redis.set(cacheKey, superjson.stringify(result), "EX", ttl);
    return result;
  }) as T;
}

export {
  withCache
}