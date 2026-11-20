import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'tbc.'

/** Reads a saved value. Returns the fallback when nothing is saved, the data is damaged or storage is blocked. */
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** Saves a value. Silently does nothing when storage is full or blocked (private windows, strict settings). */
export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* The app works without saving. */
  }
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

/**
 * Like useState, but remembers the value in the browser. `isValid` guards against old or edited data
 * so a bad saved value can never break the page.
 */
export function usePersistentState<T>(key: string, initial: T, isValid?: (value: unknown) => boolean) {
  const [value, setValue] = useState<T>(() => {
    const stored = readStored<unknown>(key, initial)
    return !isValid || isValid(stored) ? (stored as T) : initial
  })

  useEffect(() => {
    writeStored(key, value)
  }, [key, value])

  const set = useCallback((next: T | ((prev: T) => T)) => setValue(next), [])
  return [value, set] as const
}
