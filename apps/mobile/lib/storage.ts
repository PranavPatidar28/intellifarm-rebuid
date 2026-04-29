import 'expo-sqlite/localStorage/install';

import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    const value = globalThis.localStorage?.getItem(key);
    if (!value) {
      return defaultValue;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  },
  set<T>(key: string, value: T) {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    emit(key);
  },
  remove(key: string) {
    globalThis.localStorage?.removeItem(key);
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
