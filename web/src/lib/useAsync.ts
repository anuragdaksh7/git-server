import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api'

type Settled<T> = { key: string; data?: T; error?: unknown }

/**
 * Loads data for `key`, re-running whenever the key changes. Results are tagged
 * with their key so a stale response never renders for a newer key.
 */
export function useAsync<T>(key: string, load: () => Promise<T>) {
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => !cancelled && setSettled({ key, data }),
      (error) => !cancelled && setSettled({ key, error }),
    )
    return () => {
      cancelled = true
    }
    // `load` is a fresh closure every render; `key` captures what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = settled?.key === key ? settled : null
  const error = current?.error

  const update = useCallback(
    (fn: (data: T) => T) =>
      setSettled((s) => (s && s.key === key && s.data !== undefined ? { ...s, data: fn(s.data) } : s)),
    [key],
  )

  return {
    data: current?.data,
    loading: current === null,
    error: error === undefined ? '' : error instanceof Error ? error.message : String(error),
    unauthorized: error instanceof ApiError && error.status === 401,
    update,
  }
}
