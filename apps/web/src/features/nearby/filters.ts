import type { NearbyHelper } from '@/types'

export type SkillKind = 'quick' | 'care' | 'talk'

export interface NearbyChip {
  id: string
  label: string
  test: RegExp
}

/** The quick category chips on the filter panel. A helper matches when any skill title fits. */
export const NEARBY_CHIPS: NearbyChip[] = [
  { id: 'repairs', label: 'Repairs', test: /repair|bike|bicycle|furniture|flat-pack|assembly|fix/i },
  { id: 'tech', label: 'Tech', test: /phone|laptop|python|spreadsheet|tech|computer|video call|setup/i },
  { id: 'cooking', label: 'Cooking', test: /cook|bak|kueh|recipe|burmese/i },
  { id: 'tutoring', label: 'Tutoring', test: /tutor|french|english|maths?\b|conversation|lesson|geometry/i },
  { id: 'garden', label: 'Garden', test: /garden|plant|weed/i },
]

/** Which little badge a pin wears, picked from the first skill. */
export function skillKind(title: string): SkillKind {
  if (/cook|bak|garden|plant|care|visit|companionship|grocery|yoga/i.test(title)) return 'care'
  if (/tutor|french|english|maths?\b|conversation|lesson|guitar|music/i.test(title)) return 'talk'
  return 'quick'
}

export function matchesFilters(h: NearbyHelper, text: string, chip: string | null, availableNow: boolean): boolean {
  if (availableNow && !h.available_now) return false
  if (chip) {
    const c = NEARBY_CHIPS.find((x) => x.id === chip)
    if (c && !h.skills.some((s) => c.test.test(s.title))) return false
  }
  const q = text.trim().toLowerCase()
  if (q && !h.user.name.toLowerCase().includes(q) && !h.skills.some((s) => s.title.toLowerCase().includes(q))) return false
  return true
}
