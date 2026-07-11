import { useRef, useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useAppointments } from '../hooks/useAppointments'
import { useWakeTimes } from '../hooks/useWakeTimes'
import {
  formatHours,
  freeMinutes,
  occurrencesForDay,
  todayISO,
  weekdayIndex,
} from '../lib/appointments'
import QuickCapture from '../components/QuickCapture'
import Inbox from '../components/Inbox'
import Toast from '../components/Toast'

export default function InboxPage() {
  const {
    loading,
    toast,
    inboxTasks,
    todayOpenTasks,
    canPullToToday,
    addTask,
    moveToToday,
    deleteTask,
  } = useTasks()
  const { appointments, exceptions } = useAppointments()
  const { windows } = useWakeTimes()

  const [warn, setWarn] = useState<string | null>(null)
  const warnTimer = useRef<number | undefined>(undefined)

  /**
   * Capacity check (warn, never block): planned duration of today's open
   * tasks vs. free time left inside today's waking window.
   */
  function pullToToday(id: string) {
    const task = inboxTasks.find((t) => t.id === id)
    moveToToday(id)

    const idx = weekdayIndex(new Date())
    const wake = windows.get(idx)
    if (!wake) return
    const occ = occurrencesForDay(appointments, exceptions, idx, todayISO())
    const free = freeMinutes(occ, wake)
    const planned =
      todayOpenTasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0) +
      (task?.estimatedMinutes ?? 0)
    if (planned > free) {
      setWarn(`Das sind ${formatHours(planned)} Aufgaben bei ${formatHours(free)} freier Zeit heute.`)
      window.clearTimeout(warnTimer.current)
      warnTimer.current = window.setTimeout(() => setWarn(null), 4000)
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 pb-16 pt-6">
      <QuickCapture onAdd={addTask} />

      {loading ? (
        <p className="text-center text-sm text-ink-3">Lädt …</p>
      ) : (
        <Inbox
          tasks={inboxTasks}
          canPullToToday={canPullToToday}
          onMoveToToday={pullToToday}
          onDelete={deleteTask}
        />
      )}

      <Toast message={toast} />
      <Toast message={warn} variant="warn" />
    </main>
  )
}
