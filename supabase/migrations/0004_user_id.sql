-- Fokus3 · 0004_user_id.sql
-- Auth rollout, stage 1 of 2: add user_id columns while the open policies
-- stay in place, so the deployed app keeps working until the existing user
-- has signed in and their rows are backfilled. Stage 2 (0005) swaps the
-- open policies for strict per-user ones.
--
-- default auth.uid(): client inserts never send user_id explicitly — the
-- database stamps the authenticated user automatically.

alter table public.tasks
  add column user_id uuid references auth.users (id) on delete cascade default auth.uid();

alter table public.appointments
  add column user_id uuid references auth.users (id) on delete cascade default auth.uid();

alter table public.push_subscriptions
  add column user_id uuid references auth.users (id) on delete cascade default auth.uid();
