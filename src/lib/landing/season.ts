import 'server-only'
import { BLACK_NOVEMBER, CHRISTMAS, CHRISTMAS_CUTOFF, SEASON } from './content'

/** Today's date in Lagos as YYYY-MM-DD (en-CA formats dates that way). */
export function lagosToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Current Lagos time as an ISO string for date comparisons. */
function lagosNow(now = new Date()): Date {
  // Convert to Lagos time by formatting and reparsing
  const lagosStr = now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' })
  return new Date(lagosStr)
}

/**
 * True during Black November (1-30 November, Lagos time).
 * Set LANDING_SEASON_PREVIEW=black-november to force on, =off to force off.
 * The home page re-renders hourly, so the switch happens within an hour of midnight in Lagos.
 */
export function isBlackNovember(now = new Date()): boolean {
  const preview = process.env.LANDING_SEASON_PREVIEW
  if (preview === 'black-november') return true
  if (preview === 'off') return false
  // Parse the ISO dates and compare
  const startsAt = new Date(BLACK_NOVEMBER.startsAt)
  const endsAt = new Date(BLACK_NOVEMBER.endsAt)
  return now >= startsAt && now < endsAt
}

/**
 * True between SEASON.start and SEASON.end (inclusive, Lagos time).
 * Set LANDING_SEASON_PREVIEW=christmas or =off to force a mode when testing a build.
 * The home page re-renders hourly, so the switch happens within an hour of midnight in Lagos.
 */
export function isChristmasSeason(now = new Date()): boolean {
  const preview = process.env.LANDING_SEASON_PREVIEW
  if (preview === 'christmas') return true
  if (preview === 'off') return false
  // Black November takes precedence over Christmas if dates overlap
  if (isBlackNovember(now)) return false
  const today = lagosToday(now)
  return SEASON.name === 'christmas' && today >= SEASON.start && today <= SEASON.end
}

/** Banner text, or null while CHRISTMAS_CUTOFF is empty, invalid, past, or out of season. */
export function christmasBanner(now = new Date()): string | null {
  if (!isChristmasSeason(now) || !/^\d{4}-\d{2}-\d{2}$/.test(CHRISTMAS_CUTOFF)) return null
  if (lagosToday(now) > CHRISTMAS_CUTOFF) return null

  // Noon UTC keeps the weekday right in Lagos (UTC+1)
  const date = new Date(`${CHRISTMAS_CUTOFF}T12:00:00Z`)
  const label = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return CHRISTMAS.banner.replace('{date}', label)
}
