/**
 * Facebook CSV exports use ambiguous date/time strings with no timezone marker
 * (e.g. "09/01/2025 21:13", "2025-09-20T00:00:00", "August 18"). Parsing those
 * with a bare `new Date(string)` is implementation-defined: V8 treats them as
 * local time of whatever machine runs the code, so the same CSV byte produces
 * a different absolute instant on a UTC production server vs. a UTC+8 dev
 * machine. PC Merchandise is a Philippines business, so anchor every
 * ambiguous timestamp to Asia/Manila (+08:00) instead of the server clock.
 */
const MANILA_OFFSET = '+08:00'

/** Parse an ISO-shaped "YYYY-MM-DDTHH:MM:SS" string (no zone) as PH local time. */
export function parseIsoLocalAsManila(isoLocal: string): Date {
  return new Date(`${isoLocal}${MANILA_OFFSET}`)
}
