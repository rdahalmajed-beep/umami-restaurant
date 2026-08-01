/**
 * Pure branch operational-state rules (DATA-003).
 */

export type BranchOperationalState =
  | "open"
  | "closed"
  | "paused"
  | "at_capacity"

export type BranchForOperationalState = {
  is_active: boolean
  is_paused?: boolean | null
  pause_until?: Date | string | null
  opening_hours_json?: Record<string, unknown> | null
  timezone?: string | null
  capacity_orders_per_hour?: number | null
}

function parseInstant(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Minimal open/closed from opening_hours_json.
 * Supports day keys: mon..sun or 0..6, values "HH:MM-HH:MM" or [{open,close}].
 * Missing hours → treated as open (owner hasn't configured yet).
 */
export function isWithinOpeningHours(
  openingHours: Record<string, unknown> | null | undefined,
  at: Date,
  _timezone?: string | null
): boolean {
  if (!openingHours || !Object.keys(openingHours).length) {
    return true
  }

  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
  const dayKey = dayKeys[at.getDay()]
  const dayNum = String(at.getDay())
  const raw = openingHours[dayKey] ?? openingHours[dayNum]

  if (raw == null) {
    return false
  }

  const minutesNow = at.getHours() * 60 + at.getMinutes()

  const intervals: { open: number; close: number }[] = []

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map((x) => Number(x))
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    return h * 60 + m
  }

  if (typeof raw === "string") {
    const [openStr, closeStr] = raw.split("-").map((s) => s.trim())
    const open = toMinutes(openStr || "")
    const close = toMinutes(closeStr || "")
    if (open != null && close != null) {
      intervals.push({ open, close })
    }
  } else if (Array.isArray(raw)) {
    for (const row of raw) {
      if (
        row &&
        typeof row === "object" &&
        "open" in row &&
        "close" in row &&
        typeof (row as { open: unknown }).open === "string" &&
        typeof (row as { close: unknown }).close === "string"
      ) {
        const open = toMinutes((row as { open: string }).open)
        const close = toMinutes((row as { close: string }).close)
        if (open != null && close != null) {
          intervals.push({ open, close })
        }
      }
    }
  }

  if (!intervals.length) {
    return false
  }

  return intervals.some(({ open, close }) => {
    if (close < open) {
      // overnight: e.g. 18:00-02:00
      return minutesNow >= open || minutesNow <= close
    }
    return minutesNow >= open && minutesNow <= close
  })
}

export function computeBranchOperationalState(
  branch: BranchForOperationalState,
  at: Date = new Date(),
  opts?: { orders_in_last_hour?: number }
): BranchOperationalState {
  if (!branch.is_active) {
    return "closed"
  }

  if (branch.is_paused) {
    const until = parseInstant(branch.pause_until)
    if (!until || until.getTime() > at.getTime()) {
      return "paused"
    }
  }

  if (
    !isWithinOpeningHours(
      branch.opening_hours_json as Record<string, unknown> | null,
      at,
      branch.timezone
    )
  ) {
    return "closed"
  }

  const cap = branch.capacity_orders_per_hour
  if (
    cap != null &&
    cap > 0 &&
    opts?.orders_in_last_hour != null &&
    opts.orders_in_last_hour >= cap
  ) {
    return "at_capacity"
  }

  return "open"
}
