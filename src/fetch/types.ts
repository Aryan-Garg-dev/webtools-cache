export type StorageAdapter = "memory" | "redis";

export interface FetchClientOptions {
  baseURL?: string,
  ttl?: number,
  prefix?: string,
  storage?: StorageAdapter,
  retries?: number,
  onInvalidate?: (key: string)=>void,
  cacheKeyResolver?: (url: string, init?: RequestInit) => string;
  shouldCache?: (url: string, init?: RequestInit) => boolean;
}

export interface CacheStorageAdapter {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete?: (key: string) => Promise<void>;
  clear?: () => Promise<void>;
  prefix?: string;
}

export interface FetchOptions extends RequestInit {
  cacheKey?: string; 
  revalidate?: boolean;
  ttl?: number,
  retries?: number,
  useCache?: boolean,
}

export interface FetchClient {
  fetch: <T = any>(url: string, options?: FetchOptions) => Promise<{ data: T; key: string; }> ;
  prefetch: (url: string, options?: FetchOptions) => Promise<void>;
  invalidate: (tagOrKey?: string) => Promise<void>;
  getCacheKey: (url: string, options?: FetchOptions) => string
}