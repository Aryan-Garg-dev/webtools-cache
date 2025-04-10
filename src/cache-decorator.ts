import type { CacheOptions, AsyncMethod } from "@cache/types";
import { getRedisClient } from "@cache/redis-client";
import superjson from "superjson"
import stringify from "fast-json-stable-stringify";

function cache<TArgs extends any[], TResult>(
  { ttl = 60, prefix = "" }: CacheOptions = {}
) {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<AsyncMethod<TArgs, TResult>>
  ): void {
    const redis = getRedisClient();
    const originalMethod = descriptor.value!;

    descriptor.value = async function (...args: TArgs): Promise<TResult> {
      const cacheKey = `${prefix}:${String(propertyKey)}:${stringify(args)}`;

      const cached = await redis.get(cacheKey);
      if (cached) return superjson.parse(cached) as TResult;

      const result = await originalMethod.apply(this, args);
      await redis.set(cacheKey, superjson.stringify(result), "EX", ttl);
      return result;
    };
  };
}

export {
  cache
}