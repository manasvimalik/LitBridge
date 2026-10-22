import { useCallback, useEffect, useState } from 'react';
import type { Genre, LanguageCode } from './types';

/**
 * Small persisted store on top of localStorage. Every access is wrapped in
 * try/catch because storage can be unavailable (private mode, blocked
 * cookies); the app then falls back to in-memory state for the session.
 * A `storage` event listener keeps multiple tabs in sync.
 */

const PREFIX = 'litbridge:';
const memory = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFIX + key);
  } catch {
    raw = memory.get(key) ?? null;
  }
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(PREFIX + key, raw);
  } catch {
    memory.set(key, raw);
  }
  listeners.get(key)?.forEach((fn) => fn());
}

export function usePersistent<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback));

  useEffect(() => {
    const sync = () => setValue(read(key, fallback));
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(sync);
    const onStorage = (e: StorageEvent) => e.key === PREFIX + key && sync();
    window.addEventListener('storage', onStorage);
    return () => {
      set!.delete(sync);
      window.removeEventListener('storage', onStorage);
    };
    // fallback is intentionally excluded: callers pass literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(read(key, fallback)) : next;
      write(key, resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, update];
}

export interface Submission {
  id: string;
  title: string;
  originalTitle?: string;
  author: string;
  language: LanguageCode;
  genre: Genre;
  region: string;
  translator: string;
  text: string;
  translation?: string;
  summary?: string;
  themes: string[];
  createdAt: number;
  votes: number;
  status: 'pending' | 'in-review' | 'approved';
  rightsConfirmed: boolean;
}

/** A submission is approved by the community once it collects this many votes. */
export const APPROVAL_THRESHOLD = 5;

export function statusForVotes(votes: number): Submission['status'] {
  if (votes >= APPROVAL_THRESHOLD) return 'approved';
  if (votes >= 2) return 'in-review';
  return 'pending';
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
