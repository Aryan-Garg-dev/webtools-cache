export interface CacheOptions {
  ttl?: number,
  prefix?: string
}

export type AsyncFunc<TArgs extends any[] = any[], TResult = any> = (
  ...args: TArgs
) => Promise<TResult>;

export type CacheEnhanced<TArgs extends any[], TResult> = AsyncFunc<TArgs, TResult> & {
  invalidate: () => Promise<void>;
};
