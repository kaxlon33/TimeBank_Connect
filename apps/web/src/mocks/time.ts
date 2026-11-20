const DAY = 24 * 60 * 60 * 1000

export function daysAgo(days: number, hour = 10, minute = 0): string {
  const d = new Date(Date.now() - days * DAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

export function daysAhead(days: number, hour = 10, minute = 0): string {
  return daysAgo(-days, hour, minute)
}
