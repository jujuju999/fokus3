import { useEffect, useMemo } from 'react'
import { useTasks } from './useTasks'
import { useAppointments } from './useAppointments'
import { useWakeTimes } from './useWakeTimes'
import { occurrencesForDay, todayISO, weekdayIndex } from '../lib/appointments'
import {
  TRANSITION_BUFFER_MIN,
  computeFreeSlots,
  dateToMinutes,
  minutesToDate,
  planUnlocked,
  subtractBlocksPadded,
} from '../lib/scheduling'

/**
 * Mounted ONCE (in AuthGate). Watches tasks + appointments + wake times and
 * keeps the auto-assigned slots consistent — the spec'd recompute triggers
 * (task moved to/from Heute, appointment or wake change) all funnel into
 * data changes this effect observes (own device optimistically, other
 * devices via realtime).
 *
 * Convergence: writes flow through useTasks' optimistic mutate; once the
 * desired plan equals the stored plan, no further writes happen.
 * schedule_locked tasks are NEVER moved: with times they block the plan,
 * with NULL times they're opted out of planning entirely.
 */
export function useAutoScheduler() {
  const { tasks, loading: tasksLoading, setTaskSchedule } = useTasks()
  const { appointments, exceptions, loading: apptsLoading } = useAppointments()
  const { windows, loading: wakeLoading } = useWakeTimes()

  const today = todayISO()
  const weekday = weekdayIndex(new Date())

  // Fingerprint of everything the plan depends on — keeps the effect from
  // re-running on unrelated changes (e.g. inbox edits without estimates).
  const fingerprint = useMemo(() => {
    if (tasksLoading || apptsLoading || wakeLoading) return null
    const occ = occurrencesForDay(appointments, exceptions, weekday, today).map(
      (o) => `${o.startMin}-${o.endMin}`,
    )
    const wake = windows.get(weekday)
    const t = tasks.map(
      (x) =>
        `${x.id}:${x.status}:${x.estimatedMinutes}:${x.scheduledStart}:${x.scheduledEnd}:${x.scheduleLocked}:${x.plannedAt}`,
    )
    return JSON.stringify({ occ, wake, t, today })
  }, [tasks, appointments, exceptions, windows, weekday, today, tasksLoading, apptsLoading, wakeLoading])

  useEffect(() => {
    if (!fingerprint) return
    const wake = windows.get(weekday)
    if (!wake) return

    // 1. Safety net: clear slots that must not exist (done/inbox tasks,
    //    tasks whose estimate was removed). Actions already do this
    //    optimistically; this catches cross-device edge cases.
    for (const t of tasks) {
      const mustClear =
        (t.status !== 'today' || !t.estimatedMinutes) && (t.scheduledStart || t.scheduledEnd)
      if (mustClear) {
        setTaskSchedule(t.id, { start: null, end: null, locked: false })
        return // state change re-triggers the effect with fresh data
      }
    }

    const eligible = tasks.filter((t) => t.status === 'today' && t.estimatedMinutes)
    const locked = eligible.filter((t) => t.scheduleLocked)
    const unlocked = eligible
      .filter((t) => !t.scheduleLocked)
      .sort((a, b) =>
        (a.plannedAt ?? a.createdAt).localeCompare(b.plannedAt ?? b.createdAt),
      )

    // 2. Free slots: waking window minus appointments (15-min transition
    //    buffer per interval), minus locked task slots (padded both sides).
    const occs = occurrencesForDay(appointments, exceptions, weekday, today)
    const lockedSlots = locked
      .filter((t) => t.scheduledStart && t.scheduledEnd)
      .map((t) => ({
        startMin: dateToMinutes(t.scheduledStart!, today),
        endMin: dateToMinutes(t.scheduledEnd!, today),
      }))
    const free = subtractBlocksPadded(
      computeFreeSlots(occs, wake),
      lockedSlots,
      TRANSITION_BUFFER_MIN,
    )

    // 3. First-fit in Heute-Zuordnungs-Reihenfolge, then diff against DB.
    const plan = planUnlocked(
      unlocked.map((t) => ({ id: t.id, minutes: t.estimatedMinutes! })),
      free,
    )
    for (const t of unlocked) {
      const slot = plan.get(t.id) ?? null
      const desiredStart = slot ? minutesToDate(today, slot.startMin).getTime() : null
      const desiredEnd = slot ? minutesToDate(today, slot.endMin).getTime() : null
      const currentStart = t.scheduledStart ? Date.parse(t.scheduledStart) : null
      const currentEnd = t.scheduledEnd ? Date.parse(t.scheduledEnd) : null
      if (desiredStart !== currentStart || desiredEnd !== currentEnd) {
        setTaskSchedule(t.id, {
          start: slot ? minutesToDate(today, slot.startMin).toISOString() : null,
          end: slot ? minutesToDate(today, slot.endMin).toISOString() : null,
          locked: false,
        })
        return // one write per pass; convergence via re-trigger
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint])
}
