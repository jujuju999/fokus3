import { getSupabase } from './supabaseClient'

export const TODAY_LIMIT = 3

export type TaskStatus = 'inbox' | 'today' | 'done'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  /** ISO date (yyyy-mm-dd) of the day the task was pulled onto "Heute". */
  plannedDate: string | null
  createdAt: string
  completedAt: string | null
}

/** Row shape of public.tasks (snake_case, see supabase/migrations/0001_schema.sql). */
export interface TaskRow {
  id: string
  title: string
  status: TaskStatus
  planned_date: string | null
  created_at: string
  completed_at: string | null
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    plannedDate: row.planned_date,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

/** Local calendar date (not UTC) — the day boundary the user actually experiences. */
export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Client-side task for optimistic inserts; the id is reused for the DB row. */
export function createTask(title: string): Task {
  return {
    id: crypto.randomUUID(),
    title,
    status: 'inbox',
    plannedDate: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  }
}

/**
 * The hard cap counts every task pulled onto "Heute" today — including
 * completed ones. Finishing a task must not free up a fourth slot;
 * "max. 3 per day" is the product, not "max. 3 at a time".
 * The DB trigger tasks_today_cap enforces the same rule server-side.
 */
export function countUsedTodaySlots(tasks: Task[]): number {
  const today = todayISO()
  return tasks.filter((t) => t.plannedDate === today && t.status !== 'inbox').length
}

// --- Queries (all data access goes through here, per CLAUDE.md) ---

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as TaskRow[]).map(rowToTask)
}

export async function dbInsertTask(task: Task): Promise<void> {
  const { error } = await getSupabase().from('tasks').insert({
    id: task.id,
    title: task.title,
    status: task.status,
    planned_date: task.plannedDate,
    created_at: task.createdAt,
    completed_at: task.completedAt,
  })
  if (error) throw new Error(error.message)
}

export async function dbUpdateTask(
  id: string,
  fields: Partial<Pick<TaskRow, 'status' | 'planned_date' | 'completed_at'>>,
): Promise<void> {
  const { error } = await getSupabase().from('tasks').update(fields).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function dbDeleteTask(id: string): Promise<void> {
  const { error } = await getSupabase().from('tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Lazy day reset: open "Heute" tasks from previous days go back to the inbox. */
export async function dbResetStaleTodayTasks(): Promise<void> {
  const { error } = await getSupabase()
    .from('tasks')
    .update({ status: 'inbox', planned_date: null })
    .eq('status', 'today')
    .lt('planned_date', todayISO())
  if (error) throw new Error(error.message)
}
