-- Fokus3 · 0002_push.sql
-- Web-push infrastructure: subscriptions, send-dedupe log, server-only config,
-- and a 30-minute cron that triggers the send-reminders edge function.
-- The cron fires in UTC every 30 min; the edge function converts to
-- Europe/Berlin wall-clock time and decides whether the 07:00 or 21:30
-- batch is due — DST-safe without ever touching the cron expression.

-- One row per device/browser subscription (single-user V1: no user_id yet).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- RLS: open like tasks (single user, V1) — the client saves its own subscription.
alter table public.push_subscriptions enable row level security;

create policy "open access (single-user V1)" on public.push_subscriptions
  for all
  using (true)
  with check (true);

-- Dedupe log: at most one morning and one evening send per (Berlin) day.
-- RLS enabled with NO policies: only the edge function (service role) writes.
create table public.notification_log (
  type text not null check (type in ('morning', 'evening')),
  sent_date date not null,
  sent_at timestamptz not null default now(),
  primary key (type, sent_date)
);

alter table public.notification_log enable row level security;

-- Server-only key/value config (holds the VAPID keypair, inserted out-of-band —
-- never committed to the repo). RLS enabled with NO policies: the anon key
-- cannot read this table; only the edge function (service role) can.
create table public.app_config (
  key text primary key,
  value text not null
);

alter table public.app_config enable row level security;

-- Cron: call the edge function every 30 minutes.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'fokus3-send-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://nyipgbahcunppnuilfcc.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- anon key (public by design, also shipped in the client bundle)
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aXBnYmFoY3VucHBudWlsZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MjMxMzQsImV4cCI6MjA5OTA5OTEzNH0.jrHOSf_OP0d1c0DTIXrBAYuUcGZo9xSVzd3MCBzHl2w'
    ),
    body := '{}'::jsonb
  );
  $$
);
