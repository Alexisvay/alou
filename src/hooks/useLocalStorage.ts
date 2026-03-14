import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  revive?: (raw: unknown) => T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      const parsed = JSON.parse(item) as unknown;
      return revive ? revive(parsed) : (parsed as T);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (private browsing quota, etc.)
    }
  }, [key, value]);

  return [value, setValue];
}
