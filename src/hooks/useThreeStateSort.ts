import { useEffect, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortState<Key extends string> {
  key: Key
  direction: SortDirection
}

export function useThreeStateSort<Key extends string>(storageKey?: string) {
  const persistedKey = storageKey
    ? `hkipo-dashboard:sort:${storageKey}`
    : undefined
  const [sort, setSort] = useState<SortState<Key> | null>(() => {
    if (!persistedKey) return null
    try {
      const value = window.localStorage.getItem(persistedKey)
      if (!value) return null
      const parsed = JSON.parse(value) as Partial<SortState<Key>>
      if (
        typeof parsed.key === 'string' &&
        (parsed.direction === 'asc' || parsed.direction === 'desc')
      ) {
        return parsed as SortState<Key>
      }
    } catch {
      return null
    }
    return null
  })

  useEffect(() => {
    if (!persistedKey) return
    try {
      if (sort) {
        window.localStorage.setItem(persistedKey, JSON.stringify(sort))
      } else {
        window.localStorage.removeItem(persistedKey)
      }
    } catch {
      // Sorting remains usable when browser storage is unavailable.
    }
  }, [persistedKey, sort])

  const toggleSort = (key: Key) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  return { sort, toggleSort }
}

export function compareValues(
  left: number | string,
  right: number | string,
) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }
  return String(left).localeCompare(String(right), 'zh-CN')
}
