-- Fokus3 · 0006_wake_times_exceptions.sql
-- Week view v2: per-weekday waking hours, exceptions for recurring
-- appointments ("nur diese Woche"), and optional task duration estimates.
-- Note: the spec draft asked for open RLS — the project has strict per-user
-- RLS since 0005, so new tables get the same "own rows" policies.

-- Waking hours per weekday (0 = Monday). The week bar only renders this
-- window; free time is computed against it. Same-day windows only
-- (end > start) — past-midnight wake times are a deliberate non-feature
-- for now (see IDEEN.md).
create table public.wake_times (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  weekday smallint not null check (weekday between 0 and 6),
  start_min smallint not null check (start_min >= 0 and start_min < 1440),
  end_min smallint not null check (end_min > start_min and end_min <= 1440),
  primary key (user_id, weekday)
);

alter table public.wake_times enable row level security;

create policy "own rows" on public.wake_times
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Exceptions for recurring appointments: editing/deleting "nur diese Woche"
-- writes one row here instead of touching the base appointment.
create table public.appointment_exceptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  exception_date date not null,
  deleted boolean not null default false,
  new_title text,
  new_start_min smallint check (new_start_min >= 0 and new_start_min < 1440),
  new_end_min smallint check (new_end_min > new_start_min and new_end_min <= 1440),
  created_at timestamptz not null default now(),
  unique (appointment_id, exception_date)
);

alter table public.appointment_exceptions enable row level security;

create policy "own rows" on public.appointment_exceptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter publication supabase_realtime add table public.appointment_exceptions;

-- Appointments may now start before 06:00 — the visible window is the
-- user's waking time, not a fixed scale. Drop the old range checks
-- (inline checks got auto-generated names) and add one named constraint.
alter table public.appointments drop constraint if exists appointments_start_min_check;
alter table public.appointments drop constraint if exists appointments_end_min_check;
alter table public.appointments drop constraint if exists appointments_check;

alter table public.appointments
  add constraint appointments_time_range
  check (start_min >= 0 and start_min < 1440 and end_min > start_min and end_min <= 1440);

-- Optional task duration for the capacity warning (never blocks — V1's
-- only hard limit stays the 3-per-day cap).
alter table public.tasks
  add column estimated_minutes smallint check (estimated_minutes > 0);
