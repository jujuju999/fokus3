import type { WakeTime } from './wakeTimes'

/**
 * V2.5 auto-scheduling — pure functions, no I/O. Everything works in
 * "minutes since local midnight of the planned day"; values may exceed
 * 1440 when the waking window crosses midnight (Sa 9:00–1:00 = 540–1500,
 * the 0:00–1:00 part still counts as Saturday time).
 */

export interface Slot {
  startMin: number
  endMin: number
}

/** ADHS reality: transitions need room — after appointments and between tasks. */
export const TRANSITION_BUFFER_MIN = 15

/** Resolve a wake window; end_min <= start_min means it crosses midnight. */
export function effectiveWindow(wake: Pick<WakeTime, 'startMin' | 'endMin'>): Slot {
  return {
    startMin: wake.startMin,
    endMin: wake.endMin <= wake.startMin ? wake.endMin + 1440 : wake.endMin,
  }
}

function mergeBusy(blocks: Slot[]): Slot[] {
  const sorted = blocks
    .filter((b) => b.endMin > b.startMin)
    .sort((a, b) => a.startMin - b.startMin)
  const merged: Slot[] = []
  for (const b of sorted) {
    const last = merged[merged.length - 1]
    if (last && b.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, b.endMin)
    } else {
      merged.push({ ...b })
    }
  }
  return merged
}

/** Subtract busy blocks from free slots (blocks may be padded by callers). */
function subtract(free: Slot[], busy: Slot[]): Slot[] {
  let result = free.map((s) => ({ ...s }))
  for (const b of busy) {
    const next: Slot[] = []
    for (const s of result) {
      if (b.endMin <= s.startMin || b.startMin >= s.endMin) {
        next.push(s)
        continue
      }
      if (b.startMin > s.startMin) next.push({ startMin: s.startMin, endMin: b.startMin })
      if (b.endMin < s.endMin) next.push({ startMin: b.endMin, endMin: s.endMin })
    }
    result = next
  }
  return result
}

/**
 * Free intervals of a day: waking window minus appointments, then a 15-min
 * transition buffer taken off the START of every interval.
 * Appointments never cross 24:00 (DB constraint), so only the window's
 * past-midnight tail can be appointment-free by construction.
 */
export function computeFreeSlots(
  occurrences: Array<{ startMin: number; endMin: number }>,
  wake: Pick<WakeTime, 'startMin' | 'endMin'>,
): Slot[] {
  const win = effectiveWindow(wake)
  const busy = mergeBusy(
    occurrences.map((o) => ({
      startMin: Math.max(o.startMin, win.startMin),
      endMin: Math.min(o.endMin, Math.min(win.endMin, 1440)),
    })),
  )
  return subtract([win], busy)
    .map((s) => ({ startMin: s.startMin + TRANSITION_BUFFER_MIN, endMin: s.endMin }))
    .filter((s) => s.endMin > s.startMin)
}

/** Remove blocks (e.g. locked task slots) padded on both sides, keeping task-to-task buffers. */
export function subtractBlocksPadded(free: Slot[], blocks: Slot[], pad: number): Slot[] {
  return subtract(
    free,
    blocks.map((b) => ({ startMin: b.startMin - pad, endMin: b.endMin + pad })),
  ).filter((s) => s.endMin > s.startMin)
}

/**
 * Place tasks (already in planning order) first-fit into the free slots.
 * Each placed task consumes its time plus a 15-min buffer. Tasks that fit
 * nowhere map to null ("Keine Zeit heute").
 */
export function planUnlocked(
  tasks: Array<{ id: string; minutes: number }>,
  freeSlots: Slot[],
): Map<string, Slot | null> {
  const free = freeSlots.map((s) => ({ ...s })).sort((a, b) => a.startMin - b.startMin)
  const result = new Map<string, Slot | null>()
  for (const task of tasks) {
    const slot = free.find((s) => s.endMin - s.startMin >= task.minutes)
    if (!slot) {
      result.set(task.id, null)
      continue
    }
    const placed = { startMin: slot.startMin, endMin: slot.startMin + task.minutes }
    result.set(task.id, placed)
    slot.startMin = placed.endMin + TRANSITION_BUFFER_MIN
    if (slot.endMin <= slot.startMin) free.splice(free.indexOf(slot), 1)
  }
  return result
}

/** Local timestamp for `minutes` after local midnight of dateISO (handles >1440). */
export function minutesToDate(dateISO: string, minutes: number): Date {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setMinutes(minutes)
  return d
}

/** Inverse of minutesToDate for stored timestamps. */
export function dateToMinutes(iso: string, dateISO: string): number {
  return Math.round(
    (new Date(iso).getTime() - new Date(`${dateISO}T00:00:00`).getTime()) / 60000,
  )
}

export function overlapsAny(
  slot: Slot,
  occurrences: Array<{ startMin: number; endMin: number }>,
): boolean {
  return occurrences.some((o) => slot.startMin < o.endMin && slot.endMin > o.startMin)
}
