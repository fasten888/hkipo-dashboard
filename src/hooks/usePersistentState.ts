import { useEffect, useState } from 'react'
import { compressData, safeSetLocalStorageItem } from '../services/storageManager'

export function usePersistentState<T>(key: string, initialValue: T) {
  const storageKey = `hkipo-dashboard:preference:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return stored ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      safeSetLocalStorageItem(storageKey, compressData(value))
    } catch {
      // Preferences remain usable for the current session.
    }
  }, [storageKey, value])

  return [value, setValue] as const
}
