export interface CacheOptions {
  ttl?: number,
  prefix?: string
}

export type AsyncMethod<TArgs extends any[], TResult> = (...args: TArgs) => Promise<TResult>;
