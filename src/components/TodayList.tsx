import { AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import { TODAY_LIMIT, type Task } from '../lib/tasks'
import TaskItem from './TaskItem'

interface Props {
  openTasks: Task[]
  doneTasks: Task[]
  usedSlots: number
  /** Schedule chip per open task (built by the Heute page). */
  renderChip?: (task: Task) => ReactNode
  onComplete: (id: string) => void
  onUncomplete: (id: string) => void
  onMoveToInbox: (id: string) => void
}

export default function TodayList({
  openTasks,
  doneTasks,
  usedSlots,
  renderChip,
  onComplete,
  onUncomplete,
  onMoveToInbox,
}: Props) {
  const freeSlots = Math.max(0, TODAY_LIMIT - usedSlots)

  function complete(id: string) {
    // Haptic tick on supporting devices (iOS Safari ignores it — harmless).
    navigator.vibrate?.(10)
    onComplete(id)
  }

  return (
    <section aria-labelledby="today-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="today-heading" className="text-[22px] font-semibold text-ink">
          Heute
        </h2>
        <span className="font-metric text-sm font-bold tabular-nums text-ink-2">
          {usedSlots}/{TODAY_LIMIT}
        </span>
      </div>

      <ul className="space-y-4">
        <AnimatePresence initial={false}>
          {openTasks.map((task) => (
            <TaskItem
              key={task.id}
              title={task.title}
              estimatedMinutes={task.estimatedMinutes}
              chip={renderChip?.(task)}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => complete(task.id)}
                    aria-label={`„${task.title}“ als erledigt markieren`}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-edge text-ink-3 transition-all hover:border-accent/50 hover:text-accent active:scale-[0.97]"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveToInbox(task.id)}
                    aria-label={`„${task.title}“ zurück in die Inbox`}
                    className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition-all hover:bg-edge/50 hover:text-ink-2 active:scale-[0.97]"
                  >
                    ↩
                  </button>
                </>
              }
            />
          ))}

          {doneTasks.map((task) => (
            <TaskItem
              key={task.id}
              title={task.title}
              estimatedMinutes={task.estimatedMinutes}
              done
              actions={
                <button
                  type="button"
                  onClick={() => onUncomplete(task.id)}
                  aria-label={`„${task.title}“ wieder öffnen`}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-accent/40 bg-accent/15 text-accent transition-all hover:bg-accent/25 active:scale-[0.97]"
                >
                  ✓
                </button>
              }
            />
          ))}
        </AnimatePresence>

        {Array.from({ length: freeSlots }, (_, i) => (
          <li
            key={`free-${i}`}
            className="grid h-[3.25rem] place-items-center rounded-2xl border-2 border-dashed border-edge text-sm text-ink-3"
          >
            Frei
          </li>
        ))}
      </ul>
    </section>
  )
}
