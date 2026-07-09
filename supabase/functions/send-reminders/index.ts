// Fokus3 · send-reminders
// Triggered every 30 minutes by pg_cron (see 0002_push.sql). The cron runs in
// UTC; this function converts to Europe/Berlin wall-clock time and decides
// whether a batch is due — so 07:00/21:30 stay correct across DST changes.
//
// Windows: [07:00, 07:30) -> morning, [21:30, 22:00) -> evening. The
// notification_log table dedupes to one send per slot and Berlin day.
// Manual testing: POST {"force":"morning"|"evening"} bypasses the time
// window (but not the dedupe).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
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
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // VAPID keys live in app_config (RLS with no policies: service-role only).
  const { data: cfgRows, error: cfgError } = await supabase.from('app_config').select('key, value')
  const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, r.value]))
  if (cfgError || !cfg.vapid_public_key || !cfg.vapid_private_key || !cfg.vapid_subject) {
    return Response.json({ error: 'VAPID config missing in app_config' }, { status: 500 })
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
  if (body?.force === 'morning' || body?.force === 'evening') slot = body.force

  if (!slot) {
    return Response.json({ sent: 0, skipped: 'outside notification windows' })
  }

  // Dedupe: the first insert for (slot, date) wins; a retry exits here.
  const { error: logError } = await supabase
    .from('notification_log')
    .insert({ type: slot, sent_date: date })
  if (logError) {
    return Response.json({ sent: 0, skipped: `already sent (${slot} ${date})` })
  }

  // Morning batch doubles as day reset: stale "Heute" tasks return to the inbox.
  if (slot === 'morning') {
    await supabase
      .from('tasks')
      .update({ status: 'inbox', planned_date: null })
      .eq('status', 'today')
      .lt('planned_date', date)
  }

  const { count: inboxCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'inbox')
  const { count: openCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'today')
  const { count: doneCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
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

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  const payload = JSON.stringify({ title, body: text })

  let sent = 0
  let removed = 0
  for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
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

  return Response.json({ slot, date, sent, removed, subscriptions: subs?.length ?? 0 })
})
