import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_WAKE_TIMES,
  dbSaveWakeTimes,
  fetchWakeTimes,
  type WakeTime,
} from '../lib/wakeTimes'

export function useWakeTimes() {
  // null = still loading; [] = user has never set wake times (setup screen)
  const [wakeTimes, setWakeTimes] = useState<WakeTime[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchWakeTimes()
        if (!cancelled) setWakeTimes(data)
      } catch {
        if (!cancelled) {
          setError(true)
          setWakeTimes([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async (times: WakeTime[]): Promise<boolean> => {
    const prev = wakeTimes
    setWakeTimes(times)
    try {
      await dbSaveWakeTimes(times)
      return true
    } catch {
      setWakeTimes(prev)
      return false
    }
  }, [wakeTimes])

  const loading = wakeTimes === null
  const needsSetup = wakeTimes !== null && wakeTimes.length === 0

  /** Window per weekday, falling back to the 7:00–23:00 default. */
  const windows = useMemo(() => {
    const map = new Map<number, WakeTime>()
    for (const w of DEFAULT_WAKE_TIMES) map.set(w.weekday, w)
    for (const w of wakeTimes ?? []) map.set(w.weekday, w)
    return map
  }, [wakeTimes])

  return { wakeTimes, windows, loading, needsSetup, error, save }
}
