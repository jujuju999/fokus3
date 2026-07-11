import { getSupabase } from './supabaseClient'

/** Waking window of one weekday (0 = Monday), minutes since midnight. */
export interface WakeTime {
  weekday: number
  startMin: number
  endMin: number
}

interface WakeTimeRow {
  weekday: number
  start_min: number
  end_min: number
}

/** Setup default: 7:00–23:00 every day. */
export const DEFAULT_WAKE_TIMES: WakeTime[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  startMin: 7 * 60,
  endMin: 23 * 60,
}))

export async function fetchWakeTimes(): Promise<WakeTime[]> {
  const { data, error } = await getSupabase()
    .from('wake_times')
    .select('weekday, start_min, end_min')
    .order('weekday')
  if (error) throw new Error(error.message)
  return (data as WakeTimeRow[]).map((r) => ({
    weekday: r.weekday,
    startMin: r.start_min,
    endMin: r.end_min,
  }))
}

export async function dbSaveWakeTimes(times: WakeTime[]): Promise<void> {
  const { error } = await getSupabase()
    .from('wake_times')
    .upsert(
      times.map((t) => ({ weekday: t.weekday, start_min: t.startMin, end_min: t.endMin })),
      { onConflict: 'user_id,weekday' },
    )
  if (error) throw new Error(error.message)
}
