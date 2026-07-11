import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import {
  TODAY_LIMIT,
  countUsedTodaySlots,
  createTask,
  dbDeleteTask,
  dbInsertTask,
  dbResetStaleTodayTasks,
  dbUpdateTask,
  fetchTasks,
  rowToTask,
  todayISO,
  type Task,
  type TaskRow,
} from '../lib/tasks'

const TOAST_MS = 4000

function toastMessage(e: unknown): string {
  if (e instanceof Error && e.message.includes('Tageslimit')) {
    return 'Tageslimit erreicht: maximal 3 Aufgaben pro Tag.'
  }
  return 'Änderung fehlgeschlagen – bitte erneut versuchen.'
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Mirror of `tasks` for optimistic-rollback snapshots without stale closures.
  const tasksRef = useRef<Task[]>([])
  tasksRef.current = tasks
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // Initial load, with lazy day reset first.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await dbResetStaleTodayTasks()
        const data = await fetchTasks()
        if (!cancelled) setTasks(data)
      } catch {
        if (!cancelled) showToast('Aufgaben konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showToast])

  // Realtime: apply row-level changes so a second open device stays in sync.
  // Idempotent against our own optimistic updates (same ids, full-row merge).
  useEffect(() => {
    const supabase = getSupabase()
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => {
          const row = payload.new as TaskRow
          setTasks((prev) =>
            prev.some((t) => t.id === row.id) ? prev : [rowToTask(row), ...prev],
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => {
          const row = payload.new as TaskRow
          setTasks((prev) => prev.map((t) => (t.id === row.id ? rowToTask(row) : t)))
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          const { id } = payload.old as Pick<TaskRow, 'id'>
          setTasks((prev) => prev.filter((t) => t.id !== id))
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  /** Apply an optimistic update, run the DB op, roll back + toast on failure. */
  const mutate = useCallback(
    async (update: (prev: Task[]) => Task[], op: () => Promise<void>) => {
      const snapshot = tasksRef.current
      setTasks(update(snapshot))
      try {
        await op()
      } catch (e) {
        setTasks(snapshot)
        showToast(toastMessage(e))
      }
    },
    [showToast],
  )

  const addTask = useCallback(
    (title: string, estimatedMinutes: number | null = null) => {
      const trimmed = title.trim()
      if (!trimmed) return
      const task = createTask(trimmed, estimatedMinutes)
      void mutate(
        (prev) => [task, ...prev],
        () => dbInsertTask(task),
      )
    },
    [mutate],
  )

  const moveToToday = useCallback(
    (id: string) => {
      const date = todayISO()
      if (countUsedTodaySlots(tasksRef.current) >= TODAY_LIMIT) return
      void mutate(
        (prev) =>
          prev.map((t) =>
            t.id === id && t.status === 'inbox'
              ? { ...t, status: 'today' as const, plannedDate: date }
              : t,
          ),
        () => dbUpdateTask(id, { status: 'today', planned_date: date }),
      )
    },
    [mutate],
  )

  const moveToInbox = useCallback(
    (id: string) => {
      void mutate(
        (prev) =>
          prev.map((t) =>
            t.id === id && t.status === 'today'
              ? { ...t, status: 'inbox' as const, plannedDate: null }
              : t,
          ),
        () => dbUpdateTask(id, { status: 'inbox', planned_date: null }),
      )
    },
    [mutate],
  )

  const completeTask = useCallback(
    (id: string) => {
      const completedAt = new Date().toISOString()
      void mutate(
        (prev) =>
          prev.map((t) =>
            t.id === id && t.status === 'today'
              ? { ...t, status: 'done' as const, completedAt }
              : t,
          ),
        () => dbUpdateTask(id, { status: 'done', completed_at: completedAt }),
      )
    },
    [mutate],
  )

  const uncompleteTask = useCallback(
    (id: string) => {
      void mutate(
        (prev) =>
          prev.map((t) =>
            t.id === id && t.status === 'done'
              ? { ...t, status: 'today' as const, completedAt: null }
              : t,
          ),
        () => dbUpdateTask(id, { status: 'today', completed_at: null }),
      )
    },
    [mutate],
  )

  const deleteTask = useCallback(
    (id: string) => {
      void mutate(
        (prev) => prev.filter((t) => t.id !== id),
        () => dbDeleteTask(id),
      )
    },
    [mutate],
  )

  const today = todayISO()
  const inboxTasks = tasks.filter((t) => t.status === 'inbox')
  const todayOpenTasks = tasks.filter((t) => t.status === 'today')
  const todayDoneTasks = tasks.filter((t) => t.status === 'done' && t.plannedDate === today)
  const usedSlots = countUsedTodaySlots(tasks)
  const canPullToToday = usedSlots < TODAY_LIMIT

  return {
    loading,
    toast,
    inboxTasks,
    todayOpenTasks,
    todayDoneTasks,
    usedSlots,
    canPullToToday,
    addTask,
    moveToToday,
    moveToInbox,
    completeTask,
    uncompleteTask,
    deleteTask,
  }
}
