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
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="inbox-heading" className="text-lg font-semibold text-neutral-900">
          Inbox
        </h2>
        <span className="text-sm font-medium tabular-nums text-neutral-500">
          {tasks.length}
        </span>
      </div>

      {!canPullToToday && tasks.length > 0 && (
        <p className="mb-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          Deine 3 für heute stehen fest. Morgen wählst du neu.
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
          Kopf leer? Sehr gut. Neues landet hier.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              title={task.title}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => onMoveToToday(task.id)}
                    disabled={!canPullToToday}
                    aria-label={`„${task.title}“ auf Heute ziehen`}
                    className="h-9 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                  >
                    Heute
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    aria-label={`„${task.title}“ löschen`}
                    className="grid h-9 w-9 place-items-center rounded-lg text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    ×
                  </button>
                </>
              }
            />
          ))}
        </ul>
      )}
    </section>
  )
}
