import { useMemo } from 'react';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import {
  readCachedResource,
  writeCachedResource,
  type CacheEnvelope,
} from '@/lib/cache';

type CachedQueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData>,
  'queryFn' | 'queryKey'
> & {
  cacheKey: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<TData>;
};

export function useCachedQuery<TData>({
  cacheKey,
  queryKey,
  queryFn,
  ...options
}: CachedQueryOptions<TData>) {
  const cached = useMemo<CacheEnvelope<TData> | null>(
    () => readCachedResource<TData>(cacheKey),
    [cacheKey],
  );

  const query = useQuery<TData, Error>({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();
      writeCachedResource(cacheKey, data);
      return data;
    },
    initialData: cached?.data,
    ...options,
  });

  return {
    ...query,
    cachedAt: cached?.savedAt ?? null,
    hasCachedData: Boolean(cached),
  };
}
