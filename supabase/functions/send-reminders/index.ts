// Fokus3 · send-reminders
// Triggered every 30 minutes by pg_cron (see 0002_push.sql). The cron runs in
// UTC; this function converts to Europe/Berlin wall-clock time and decides
// whether a batch is due — so 07:00/21:30 stay correct across DST changes.
//
// Windows: [07:00, 07:30) -> morning, [21:30, 22:00) -> evening. Sends are
// per user: each user gets their own counts and their own dedupe entry in
// notification_log (PK user_id + type + sent_date).
// Manual testing: POST {"force":"morning"|"evening"} bypasses the time
// window (but not the dedupe); {"test":"morning"|"evening"} additionally
// skips dedupe + day reset and prefixes the title with "Test:".

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

// CORS: the dev test panel calls this function from the browser
// (supabase.functions.invoke), which sends an OPTIONS preflight first.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function berlinNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const hour = Number(get('hour')) % 24 // Intl may report "24" at midnight
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + Number(get('minute')),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // VAPID keys live in app_config (RLS with no policies: service-role only).
  const { data: cfgRows, error: cfgError } = await supabase.from('app_config').select('key, value')
  const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, r.value]))
  if (cfgError || !cfg.vapid_public_key || !cfg.vapid_private_key || !cfg.vapid_subject) {
    return json({ error: 'VAPID config missing in app_config' }, 500)
  }
  webpush.setVapidDetails(cfg.vapid_subject, cfg.vapid_public_key, cfg.vapid_private_key)

  const { date, minutes } = berlinNow()
  let slot: 'morning' | 'evening' | null =
    minutes >= 7 * 60 && minutes < 7 * 60 + 30
      ? 'morning'
      : minutes >= 21 * 60 + 30 && minutes < 22 * 60
        ? 'evening'
        : null

  const body = await req.json().catch(() => ({}))
  // Test mode (dev button in the app): sends immediately but skips the
  // dedupe log and the day reset — a test at 18:00 must never swallow the
  // real 21:30 send.
  const isTest = body?.test === 'morning' || body?.test === 'evening'
  if (isTest) slot = body.test
  else if (body?.force === 'morning' || body?.force === 'evening') slot = body.force

  if (!slot) {
    return json({ sent: 0, skipped: 'outside notification windows' })
  }

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  const byUser = new Map<string, PushSubscriptionRow[]>()
  for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
    const list = byUser.get(sub.user_id) ?? []
    list.push(sub)
    byUser.set(sub.user_id, list)
  }
  if (byUser.size === 0) {
    return json({ slot, date, sent: 0, users: 0 })
  }

  // Morning batch doubles as day reset: stale "Heute" tasks (all users)
  // return to the inbox.
  if (slot === 'morning' && !isTest) {
    await supabase
      .from('tasks')
      .update({ status: 'inbox', planned_date: null })
      .eq('status', 'today')
      .lt('planned_date', date)
  }

  let sent = 0
  let removed = 0
  let skippedUsers = 0

  for (const [userId, userSubs] of byUser) {
    if (!isTest) {
      // Per-user dedupe: the first insert wins; a retry skips this user.
      const { error: logError } = await supabase
        .from('notification_log')
        .insert({ user_id: userId, type: slot, sent_date: date })
      if (logError) {
        skippedUsers++
        continue
      }
    }

    const { count: inboxCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'inbox')
    const { count: openCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'today')
    const { count: doneCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'done')
      .eq('planned_date', date)

    let title: string
    let text: string
    if (slot === 'morning') {
      title = 'Wähle deine 3'
      text =
        (inboxCount ?? 0) > 0
          ? `${inboxCount} Aufgabe${inboxCount === 1 ? ' wartet' : 'n warten'} in der Inbox.`
          : 'Deine Inbox ist leer. Was steht heute an?'
    } else {
      title = 'Was ist offen?'
      if ((openCount ?? 0) > 0) {
        text = `Noch ${openCount} von 3 offen – kurzer Blick?`
      } else if ((doneCount ?? 0) > 0) {
        text = 'Alles erledigt – stark!'
      } else {
        text = 'Heute war nichts geplant. Morgen früh wählst du neu.'
      }
    }
    if (isTest) title = `Test: ${title}`

    const payload = JSON.stringify({ title, body: text })
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        // Subscription expired or revoked — clean it up.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          removed++
        } else {
          console.error(`push to ${sub.endpoint} failed:`, err)
        }
      }
    }
  }

  return json({ slot, date, sent, removed, users: byUser.size, skippedUsers })
})
