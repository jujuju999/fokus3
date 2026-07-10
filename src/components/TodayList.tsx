import { TODAY_LIMIT, type Task } from '../lib/tasks'
import TaskItem from './TaskItem'

interface Props {
  openTasks: Task[]
  doneTasks: Task[]
  usedSlots: number
  onComplete: (id: string) => void
  onUncomplete: (id: string) => void
  onMoveToInbox: (id: string) => void
}

export default function TodayList({
  openTasks,
  doneTasks,
  usedSlots,
  onComplete,
  onUncomplete,
  onMoveToInbox,
}: Props) {
  const freeSlots = Math.max(0, TODAY_LIMIT - usedSlots)

  return (
    <section aria-labelledby="today-heading">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="today-heading" className="text-lg font-semibold text-neutral-900">
          Heute
        </h2>
        <span className="text-sm font-medium tabular-nums text-neutral-500">
          {usedSlots}/{TODAY_LIMIT}
        </span>
      </div>

      <ul className="space-y-2">
        {openTasks.map((task) => (
          <TaskItem
            key={task.id}
            title={task.title}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  aria-label={`„${task.title}“ als erledigt markieren`}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-400 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => onMoveToInbox(task.id)}
                  aria-label={`„${task.title}“ zurück in die Inbox`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
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
            done
            actions={
              <button
                type="button"
                onClick={() => onUncomplete(task.id)}
                aria-label={`„${task.title}“ wieder öffnen`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
              >
                ✓
              </button>
            }
          />
        ))}

        {Array.from({ length: freeSlots }, (_, i) => (
          <li
            key={`free-${i}`}
            className="grid h-[3.25rem] place-items-center rounded-xl border-2 border-dashed border-neutral-200 text-sm text-neutral-300"
          >
            Frei
          </li>
        ))}
      </ul>
    </section>
  )
}
