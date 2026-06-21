import { useEffect, useState } from 'react'

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
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // Preferences remain usable for the current session.
    }
  }, [storageKey, value])

  return [value, setValue] as const
}
