-- Fokus3 · 0001_schema.sql
-- Single-user V1: no auth yet. RLS is enabled but fully permissive so the
-- anon key can read/write. V2 adds Supabase Auth, a user_id column and
-- per-user policies (user_id = auth.uid()) replacing the open policy below.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'inbox' check (status in ('inbox', 'today', 'done')),
  planned_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- RLS: enabled but open (single user, V1). Replaced by auth.uid() policies in V2.
alter table public.tasks enable row level security;

create policy "open access (single-user V1)" on public.tasks
  for all
  using (true)
  with check (true);

-- Hard daily cap: max 3 tasks pulled onto "Heute" per day.
-- Completed tasks keep counting — finishing your 3 must not free a 4th slot.
-- Only transitions INTO 'today' from the inbox (or fresh inserts) are guarded;
-- completing (today -> done) and re-opening (done -> today) don't change the count.
create or replace function public.enforce_today_cap()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'today' and (tg_op = 'INSERT' or old.status = 'inbox') then
    if (
      select count(*)
      from public.tasks
      where planned_date = new.planned_date
        and status in ('today', 'done')
        and id <> new.id
    ) >= 3 then
      raise exception 'Tageslimit erreicht: maximal 3 Aufgaben pro Tag';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_today_cap
  before insert or update on public.tasks
  for each row
  execute function public.enforce_today_cap();

-- Realtime: broadcast changes so a second open device stays in sync.
alter publication supabase_realtime add table public.tasks;
