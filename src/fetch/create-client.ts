import type { FetchClientOptions, FetchClient, CacheStorageAdapter, FetchOptions } from "./types";
import { createRedisAdapter, createMemoryAdapter } from "./cache-storage-adapters";
import SuperJSON from "superjson";
import { randomUUID } from "crypto";

export const createFetchClient = (defaultOptions: FetchClientOptions = {}): FetchClient =>{
  const  {
    baseURL = "",
    ttl = 60,
    storage,
    retries = 0,
    prefix = "",
    cacheKeyResolver = (url) => url,
    shouldCache = () => true,
    onInvalidate,
  } = defaultOptions;

  const storageAdapter: CacheStorageAdapter = storage === "redis"
    ? createRedisAdapter()
    : createMemoryAdapter();

  const getCacheKey = (url: string, options?: FetchOptions) => {
    const finalUrl = baseURL ? new URL(url, baseURL).toString() : url;
    const rawKey = options?.cacheKey ?? cacheKeyResolver(finalUrl, options);
    const instancePrefix = prefix || storageAdapter.prefix || randomUUID();
    return `${instancePrefix}:${rawKey}`;
  };

  const tryFetch = async <T>(url: string, options: RequestInit = {}, retries = 0): Promise<T> => {
    let attempts = 0;
    while (attempts <= retries) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json() as T;
      } catch (e) {
        console.error("Retrying.... Fetch failed:", e);
        if (attempts++ >= retries) throw e;
      }
    }
    throw new Error("Fetch failed after retries");
  };

  const fetchResponse = <T = any>(data: T, key: string) => ({ data, key });

  const fetchWithCache = async <T = any>(url: string, options?: FetchOptions): Promise<{ data: T; key: string; }> => {
    const {
      method = "GET",
      revalidate = false,
      retries: customRetries = retries,
      ttl: customTtl = ttl,
      useCache = shouldCache(url, options),
    } = options ?? {};

    const key = getCacheKey(url, options);
    const finalUrl = baseURL ? new URL(url, baseURL).toString() : url;

    if (method.toUpperCase() !== "GET" || !useCache || revalidate) {
      const data = await tryFetch<T>(finalUrl, options, customRetries);
      return fetchResponse<T>(data, key);
    }

    const cached = await storageAdapter.get(key);
    if (cached && !revalidate) {
      try {
        const data = SuperJSON.parse(cached) as T;
        return fetchResponse<T>(data, key);
      } catch {
        await storageAdapter.delete?.(key);
      }
    }

    const data = await tryFetch<T>(finalUrl, options, customRetries);
    await storageAdapter.set(key, SuperJSON.stringify(data), customTtl);
    return fetchResponse<T>(data, key)
  };

  const invalidate = async (tagOrKey?: string) => {
    if (!tagOrKey) {
      await storageAdapter.clear?.();
    } else {
      await storageAdapter.delete?.(tagOrKey);
    }
    onInvalidate?.(tagOrKey ?? "*");
  };

  const prefetch = async (url: string, options?: FetchOptions) => {
    await fetchWithCache(url, { ...options });
  };

  return {
    fetch: fetchWithCache,
    invalidate,
    prefetch,
    getCacheKey
  };
}

