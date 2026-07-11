import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'
import { useAppointments } from '../hooks/useAppointments'
import { useWakeTimes } from '../hooks/useWakeTimes'
import type { Task } from '../lib/tasks'
import {
  minutesToTime,
  occurrencesForDay,
  todayISO,
  weekdayIndex,
} from '../lib/appointments'
import {
  TRANSITION_BUFFER_MIN,
  computeFreeSlots,
  dateToMinutes,
  minutesToDate,
  overlapsAny,
  subtractBlocksPadded,
} from '../lib/scheduling'
import ProgressRing from '../components/ProgressRing'
import TodayList from '../components/TodayList'
import TaskScheduleSheet from '../components/TaskScheduleSheet'
import NotificationSetup from '../components/NotificationSetup'
import PushTest from '../components/PushTest'
import Toast from '../components/Toast'
import { signOut } from '../lib/auth'

// Rotating micro-copy for an empty day — one variant per app open.
const MICRO_COPY = [
  'Was ist heute wichtig?',
  'Wähle drei.',
  '3 Dinge, mehr nicht.',
  'Was zählt heute?',
  'Deine drei.',
]

export default function Home() {
  const {
    loading,
    toast,
    tasks,
    todayOpenTasks,
    todayDoneTasks,
    usedSlots,
    completeTask,
    uncompleteTask,
    moveToInbox,
    setTaskSchedule,
  } = useTasks()
  const { appointments, exceptions } = useAppointments()
  const { windows } = useWakeTimes()

  const [sheetTaskId, setSheetTaskId] = useState<string | null>(null)
  const [warn, setWarn] = useState<string | null>(null)
  const warnTimer = useRef<number | undefined>(undefined)

  const today = todayISO()
  const weekday = weekdayIndex(new Date())

  const microCopy = useMemo(
    () => MICRO_COPY[Math.floor(Math.random() * MICRO_COPY.length)],
    [],
  )

  // "Fokus komplett." overlay when the third task gets checked off.
  const doneCount = todayDoneTasks.length
  const [celebrate, setCelebrate] = useState(false)
  const prevDone = useRef<number | null>(null)
  useEffect(() => {
    if (prevDone.current !== null && prevDone.current < 3 && doneCount >= 3) {
      setCelebrate(true)
      const timer = window.setTimeout(() => setCelebrate(false), 3000)
      return () => window.clearTimeout(timer)
    }
    prevDone.current = doneCount
  }, [doneCount])
  useEffect(() => {
    prevDone.current = doneCount
  }, [doneCount])

  function showWarn(message: string) {
    setWarn(message)
    window.clearTimeout(warnTimer.current)
    warnTimer.current = window.setTimeout(() => setWarn(null), 4000)
  }

  // Scheduled first (by start time), unplanned after — the day reads top-down.
  const sortedOpen = useMemo(() => {
    return [...todayOpenTasks].sort((a, b) => {
      if (a.scheduledStart && b.scheduledStart)
        return a.scheduledStart.localeCompare(b.scheduledStart)
      if (a.scheduledStart) return -1
      if (b.scheduledStart) return 1
      return (a.plannedAt ?? a.createdAt).localeCompare(b.plannedAt ?? b.createdAt)
    })
  }, [todayOpenTasks])

  const occs = occurrencesForDay(appointments, exceptions, weekday, today)

  /** Free slots left today, minus locked task slots — for the "too short" toast. */
  function remainingFreeSlots() {
    const wake = windows.get(weekday)
    if (!wake) return []
    const lockedSlots = tasks
      .filter((t) => t.status === 'today' && t.scheduleLocked && t.scheduledStart && t.scheduledEnd)
      .map((t) => ({
        startMin: dateToMinutes(t.scheduledStart!, today),
        endMin: dateToMinutes(t.scheduledEnd!, today),
      }))
    return subtractBlocksPadded(computeFreeSlots(occs, wake), lockedSlots, TRANSITION_BUFFER_MIN)
  }

  function handleNoSlotTap() {
    const lengths = remainingFreeSlots().map((s) => `${s.endMin - s.startMin} min`)
    showWarn(
      lengths.length
        ? `Deine freien Slots heute sind zu kurz (${lengths.join(', ')}). Dauer anpassen oder Termine prüfen.`
        : 'Heute ist kein freier Slot mehr übrig. Termine prüfen oder morgen neu wählen.',
    )
  }

  function renderChip(task: Task) {
    if (!task.estimatedMinutes) return undefined // "Wann-du-willst"-Aufgabe
    if (task.scheduledStart && task.scheduledEnd) {
      const s = dateToMinutes(task.scheduledStart, today)
      const e = dateToMinutes(task.scheduledEnd, today)
      return (
        <button
          type="button"
          onClick={() => setSheetTaskId(task.id)}
          aria-label={`Zeit-Slot von „${task.title}“ bearbeiten`}
          className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent transition-all hover:bg-accent/20 active:scale-[0.97]"
        >
          {task.scheduleLocked ? '🔒' : '✦ Auto'} · {minutesToTime(s % 1440)}–{minutesToTime(e % 1440)}
        </button>
      )
    }
    if (task.scheduleLocked) {
      // manually unscheduled ("Entfernen") — opted out of auto-planning
      return (
        <button
          type="button"
          onClick={() => setSheetTaskId(task.id)}
          className="rounded-full border border-edge px-2.5 py-0.5 text-xs text-ink-3 transition-all hover:text-ink-2 active:scale-[0.97]"
        >
          ohne Zeit
        </button>
      )
    }
    // wants a slot, none fits
    return (
      <button
        type="button"
        onClick={handleNoSlotTap}
        className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn transition-all hover:bg-warn/20 active:scale-[0.97]"
      >
        Keine Zeit heute
      </button>
    )
  }

  const sheetTask = sheetTaskId ? tasks.find((t) => t.id === sheetTaskId) : null

  function handleFix(startMin: number) {
    if (!sheetTask?.estimatedMinutes) return
    const endMin = startMin + sheetTask.estimatedMinutes
    if (overlapsAny({ startMin, endMin }, occs)) {
      showWarn('Dieser Slot überschneidet einen Termin.')
    }
    setTaskSchedule(sheetTask.id, {
      start: minutesToDate(today, startMin).toISOString(),
      end: minutesToDate(today, endMin).toISOString(),
      locked: true,
    })
    setSheetTaskId(null)
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 pb-16 pt-6">
      {loading ? (
        <p className="text-center text-sm text-ink-3">Lädt …</p>
      ) : (
        <>
          <ProgressRing done={doneCount} />

          {todayOpenTasks.length === 0 && doneCount === 0 && (
            <p className="text-center text-[15px] text-ink-2">{microCopy}</p>
          )}

          <TodayList
            openTasks={sortedOpen}
            doneTasks={todayDoneTasks}
            usedSlots={usedSlots}
            renderChip={renderChip}
            onComplete={completeTask}
            onUncomplete={uncompleteTask}
            onMoveToInbox={moveToInbox}
          />
        </>
      )}

      <div className="mt-4 space-y-4">
        <NotificationSetup />
        <PushTest />
        <button
          type="button"
          onClick={() => void signOut()}
          className="mx-auto block text-xs text-ink-3 transition-colors hover:text-ink-2"
        >
          Abmelden
        </button>
      </div>

      {sheetTask && sheetTask.estimatedMinutes && (
        <TaskScheduleSheet
          taskTitle={sheetTask.title}
          durationMinutes={sheetTask.estimatedMinutes}
          initialStartMin={
            sheetTask.scheduledStart ? dateToMinutes(sheetTask.scheduledStart, today) : null
          }
          hasSlot={!!sheetTask.scheduledStart}
          locked={sheetTask.scheduleLocked}
          onFix={handleFix}
          onRelease={() => {
            setTaskSchedule(sheetTask.id, {
              start: sheetTask.scheduledStart,
              end: sheetTask.scheduledEnd,
              locked: false,
            })
            setSheetTaskId(null)
          }}
          onRemove={() => {
            // locked=true with NULL times = opted out, auto-scheduler stays away
            setTaskSchedule(sheetTask.id, { start: null, end: null, locked: true })
            setSheetTaskId(null)
          }}
          onClose={() => setSheetTaskId(null)}
        />
      )}

      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCelebrate(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="rounded-2xl border border-edge bg-card px-10 py-7 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              <p className="font-metric text-xl font-bold text-accent">Fokus komplett.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={toast} />
      <Toast message={warn} variant="warn" />
    </main>
  )
}
