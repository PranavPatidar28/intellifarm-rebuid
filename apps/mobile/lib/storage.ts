import 'expo-sqlite/localStorage/install';

import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const rawSnapshotCache = new Map<string, string | null>();
const parsedSnapshotCache = new Map<string, unknown>();

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    const value = globalThis.localStorage?.getItem(key) ?? null;
    const cachedRaw = rawSnapshotCache.get(key);

    if (value === null) {
      if (cachedRaw === null && parsedSnapshotCache.has(key)) {
        return parsedSnapshotCache.get(key) as T;
      }

      rawSnapshotCache.set(key, null);
      parsedSnapshotCache.set(key, defaultValue);
      return defaultValue;
    }

    if (cachedRaw === value && parsedSnapshotCache.has(key)) {
      return parsedSnapshotCache.get(key) as T;
    }

    try {
      const parsed = JSON.parse(value) as T;
      rawSnapshotCache.set(key, value);
      parsedSnapshotCache.set(key, parsed);
      return parsed;
    } catch {
      rawSnapshotCache.set(key, null);
      parsedSnapshotCache.set(key, defaultValue);
      return defaultValue;
    }
  },
  set<T>(key: string, value: T) {
    const serialized = JSON.stringify(value);
    globalThis.localStorage?.setItem(key, serialized);
    rawSnapshotCache.set(key, serialized);
    parsedSnapshotCache.set(key, value);
    emit(key);
  },
  remove(key: string) {
    globalThis.localStorage?.removeItem(key);
    rawSnapshotCache.delete(key);
    parsedSnapshotCache.delete(key);
    emit(key);
  },
  subscribe(key: string, listener: Listener) {
    const current = listeners.get(key) ?? new Set<Listener>();
    current.add(listener);
    listeners.set(key, current);

    return () => {
      current.delete(listener);
    };
  },
};

export function useStoredValue<T>(key: string, defaultValue: T) {
  const value = useSyncExternalStore(
    (callback) => storage.subscribe(key, callback),
    () => storage.get(key, defaultValue),
    () => defaultValue,
  );

  return [
    value,
    (nextValue: T) => {
      storage.set(key, nextValue);
    },
  ] as const;
}
