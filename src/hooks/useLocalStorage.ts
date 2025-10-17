import { useState, useCallback, useEffect } from "react";

/**
 * Custom hook for syncing state with localStorage
 * Handles JSON serialization/deserialization and error cases
 *
 * @param key - localStorage key
 * @param initialValue - default value if key doesn't exist
 * @returns tuple of [value, setValue] similar to useState
 */
export function useLocalStorage<T>(
  key: string | null | undefined,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage
  const [state, setState] = useState<T>(() => {
    if (!key) return initialValue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    return initialValue;
  });

  // Update localStorage whenever state changes
  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, state]);

  // Setter function that supports both direct values and updater functions
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      return nextValue;
    });
  }, []);

  return [state, setValue];
}

/**
 * Simpler version that only reads from localStorage once (no syncing)
 * Useful when you only need initial value from localStorage
 */
export function readFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
  }
  return fallback;
}

/**
 * Write to localStorage with error handling
 */
export function writeToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
  }
}
