-- Fokus3 · 0005_auth_policies.sql
-- Auth rollout, stage 2 of 2. Prerequisites (done out-of-band, in order):
--   1. the user has signed in once (auth.users row exists)
--   2. all existing rows were backfilled: user_id = <that user's id>
-- Only then apply this migration — it makes user_id mandatory and replaces
-- the open single-user policies with strict per-user ones.

-- tasks -------------------------------------------------------------------
alter table public.tasks alter column user_id set not null;

drop policy "open access (single-user V1)" on public.tasks;

create policy "own rows" on public.tasks
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- appointments --------------------------------------------------------------
alter table public.appointments alter column user_id set not null;

drop policy "open access (single-user)" on public.appointments;

create policy "own rows" on public.appointments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- push_subscriptions --------------------------------------------------------
alter table public.push_subscriptions alter column user_id set not null;

drop policy "open access (single-user V1)" on public.push_subscriptions;

create policy "own rows" on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- notification_log: dedupe becomes per user. Old rows are pre-auth history
-- without user_id — safe to drop (dedupe only matters within one day).
delete from public.notification_log;

alter table public.notification_log
  add column user_id uuid not null references auth.users (id) on delete cascade;

alter table public.notification_log drop constraint notification_log_pkey;
alter table public.notification_log add primary key (user_id, type, sent_date);
-- still RLS-enabled with no policies: only the edge function writes.

-- daily cap now counts per user ---------------------------------------------
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
        and user_id = new.user_id
        and status in ('today', 'done')
        and id <> new.id
    ) >= 3 then
      raise exception 'Tageslimit erreicht: maximal 3 Aufgaben pro Tag';
    end if;
  end if;
  return new;
end;
$$;
