-- Fokus3 · 0007_task_scheduling.sql
-- V2.5 auto-scheduling: tasks with a duration estimate get a concrete time
-- slot inside today's free time. Slot computation lives client-side
-- (src/lib/scheduling.ts + useAutoScheduler) — the DB only stores results.

alter table public.tasks
  -- concrete slot for today; only set while status = 'today' and an
  -- estimate exists. Cleared on complete / move back to inbox / day reset.
  add column scheduled_start timestamptz,
  add column scheduled_end timestamptz,
  -- true = manually set/confirmed: the auto-scheduler must never move it.
  -- (schedule_locked = true with NULL times = "manually unscheduled",
  -- i.e. opted out of auto-planning entirely.)
  add column schedule_locked boolean not null default false,
  -- when the task was pulled onto "Heute" — defines auto-planning order
  add column planned_at timestamptz;

-- tasks already on "Heute" get a defined order
update public.tasks
set planned_at = now()
where status in ('today', 'done') and planned_at is null;

-- Wake times may now cross midnight (e.g. Sa 9:00–1:00):
-- end_min < start_min means the window runs into the next day (+24h).
alter table public.wake_times drop constraint if exists wake_times_start_min_check;
alter table public.wake_times drop constraint if exists wake_times_end_min_check;
alter table public.wake_times drop constraint if exists wake_times_check;

alter table public.wake_times
  add constraint wake_times_start_range check (start_min >= 0 and start_min < 1440);
alter table public.wake_times
  add constraint wake_times_end_range check (end_min >= 0 and end_min <= 1440 and end_min <> start_min);
