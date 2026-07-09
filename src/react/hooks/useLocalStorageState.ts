import { useEffect, useState } from "react";

/**
 * Drop-in replacement for useState that persists to localStorage.
 * Used as a fast-path flag while Firebase Auth restores asynchronously.
 */
export function useLocalStorageState<T>(
  key: string | undefined,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (!key) return defaultValue;
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota exceeded or restricted */
    }
  }, [key, value]);

  return [value, setValue];
}
