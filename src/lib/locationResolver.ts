// Resolve which location a given appointment happens at.
//
// Resolution rules, in order:
//   1. If the appointment has an explicit `location_id`, use it.
//   2. If not, infer from the day-of-week of the appointment and each location's
//      `work_days`. If exactly one location attends that day, use it.
//   3. If multiple (overlap) or none match, fall back to the primary location.
//   4. If there are no locations at all, return null.

export interface ResolvableLocation {
  id: string
  name: string
  address: string
  city: string
  work_days: string[]
  is_primary: boolean
}

const DOW_ES: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
}

export function resolveLocationForDate<T extends ResolvableLocation>(
  explicitLocationId: string | null | undefined,
  dateISO: string | null | undefined,
  locations: T[],
): T | null {
  if (!locations || locations.length === 0) return null

  // 1. Explicit wins
  if (explicitLocationId) {
    const match = locations.find((l) => l.id === explicitLocationId)
    if (match) return match
    // fall through if the FK points to a deleted location
  }

  // 2. Infer from day-of-week
  if (dateISO) {
    const d = new Date(dateISO + 'T12:00:00')
    const dow = DOW_ES[d.getDay()]
    const matching = locations.filter((l) => l.work_days?.includes(dow))
    if (matching.length === 1) return matching[0]
    // If multiple match (overlap days), prefer the primary within the matches
    if (matching.length > 1) {
      return matching.find((l) => l.is_primary) ?? matching[0]
    }
  }

  // 3. Fallback to primary, then first
  return locations.find((l) => l.is_primary) ?? locations[0]
}
