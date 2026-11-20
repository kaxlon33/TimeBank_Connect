import type { Area } from '@/types'
import { formatDistance } from './format'

/** Nearby members show a distance; far-away ones show their area and country instead. */
export function whereLabel(area: Area | null, distance: number | null): string {
  if (!area) return ''
  if (distance === null || distance > 50) return `${area.name}, ${area.country_name}`
  if (distance < 0.2) return `${area.name} · your area`
  return `${area.name} · ${formatDistance(distance)}`
}
