import { storage } from '@/lib/storage';

const CACHE_PREFIX = 'cache:';

export type CacheEnvelope<T> = {
  data: T;
  savedAt: string;
};

export function readCachedResource<T>(key: string) {
  return storage.get<CacheEnvelope<T> | null>(`${CACHE_PREFIX}${key}`, null);
}

export function writeCachedResource<T>(key: string, data: T) {
  const envelope: CacheEnvelope<T> = {
    data,
    savedAt: new Date().toISOString(),
  };

  storage.set(`${CACHE_PREFIX}${key}`, envelope);
  return envelope;
}

export function clearCachedResource(key: string) {
  storage.remove(`${CACHE_PREFIX}${key}`);
}
