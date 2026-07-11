import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'
import ProgressRing from '../components/ProgressRing'
import TodayList from '../components/TodayList'
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
    todayOpenTasks,
    todayDoneTasks,
    usedSlots,
    completeTask,
    uncompleteTask,
    moveToInbox,
  } = useTasks()

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
            openTasks={todayOpenTasks}
            doneTasks={todayDoneTasks}
            usedSlots={usedSlots}
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
    </main>
  )
}
