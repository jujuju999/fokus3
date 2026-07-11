import { AnimatePresence } from 'framer-motion'
import type { Task } from '../lib/tasks'
import TaskItem from './TaskItem'

interface Props {
  tasks: Task[]
  canPullToToday: boolean
  onMoveToToday: (id: string) => void
  onDelete: (id: string) => void
}

export default function Inbox({ tasks, canPullToToday, onMoveToToday, onDelete }: Props) {
  return (
    <section aria-labelledby="inbox-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="inbox-heading" className="text-[22px] font-semibold text-ink">
          Inbox
        </h2>
        <span className="font-metric text-sm font-bold tabular-nums text-ink-2">
          {tasks.length}
        </span>
      </div>

      {!canPullToToday && tasks.length > 0 && (
        <p className="mb-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          Deine 3 für heute stehen fest. Morgen wählst du neu.
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-edge px-4 py-8 text-center text-sm text-ink-3">
          Kopf leer? Sehr gut. Neues landet hier.
        </p>
      ) : (
        <ul className="space-y-4">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                title={task.title}
                estimatedMinutes={task.estimatedMinutes}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => onMoveToToday(task.id)}
                      disabled={!canPullToToday}
                      aria-label={`„${task.title}“ auf Heute ziehen`}
                      className="h-9 rounded-xl bg-accent px-3 text-sm font-medium text-base transition-all hover:bg-accent/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-edge disabled:text-ink-3"
                    >
                      Heute
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      aria-label={`„${task.title}“ löschen`}
                      className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition-all hover:bg-edge/50 hover:text-ink-2 active:scale-[0.97]"
                    >
                      ×
                    </button>
                  </>
                }
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
