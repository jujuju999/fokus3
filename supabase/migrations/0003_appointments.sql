-- Fokus3 · 0003_appointments.sql
-- "Woche" capacity view: appointments block time on a 06:00-24:00 scale so
-- the user can judge how much room a day really has before pulling tasks
-- onto "Heute". Deliberately minimal — no categories, colors or reminders.
--
-- Two kinds of appointments:
--   recurring = true  -> tied to a weekday (0 = Monday), repeats every week
--                        until deleted (no end date, by design)
--   recurring = false -> tied to one concrete date; the view only shows the
--                        current week, so past one-offs simply drop out

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  recurring boolean not null default false,
  weekday smallint check (weekday between 0 and 6),
  date date,
  -- minutes since midnight; the visible scale is 06:00 (360) to 24:00 (1440)
  start_min smallint not null check (start_min >= 360 and start_min < 1440),
  end_min smallint not null check (end_min > start_min and end_min <= 1440),
  created_at timestamptz not null default now(),
  constraint appointment_day check (
    (recurring and weekday is not null and date is null) or
    (not recurring and date is not null and weekday is null)
  )
);

-- RLS: open like tasks (single user). Replaced by auth.uid() policies once
-- the auth stage lands (adds user_id to all user-data tables).
alter table public.appointments enable row level security;

create policy "open access (single-user)" on public.appointments
  for all
  using (true)
  with check (true);

-- Realtime: keep a second open device in sync, same as tasks.
alter publication supabase_realtime add table public.appointments;
