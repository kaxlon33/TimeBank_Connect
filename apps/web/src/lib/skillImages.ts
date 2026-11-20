import type { Skill } from '@/types'

/** Pictures live in /public/skills. Later, a new picture is generated when a member posts a skill. */
const BY_TITLE: [RegExp, string][] = [
  [/bicycle|bike/i, 'bicycle-repair'],
  [/smartphone|phone|video call/i, 'smartphone'],
  [/french/i, 'french'],
  [/english|conversation/i, 'english'],
  [/kueh|baking|cake/i, 'baking'],
  [/cook|burmese|recipe/i, 'cooking'],
  [/garden|plant|weed/i, 'garden'],
  [/guitar|music|piano/i, 'guitar'],
  [/yoga|stretch|fitness/i, 'yoga'],
  [/flat-pack|furniture|assembly|wardrobe/i, 'furniture'],
  [/python|spreadsheet|excel|laptop|code/i, 'spreadsheet'],
  [/maths?\b|geometry|algebra/i, 'maths'],
  [/moving|boxes|\bvan\b/i, 'moving'],
  [/grocery|shopping|errand/i, 'grocery'],
  [/companionship|visit|chess/i, 'companionship'],
]

const BY_CATEGORY: Record<string, string> = {
  'home-and-garden': 'garden',
  'repairs-and-diy': 'furniture',
  'tech-help': 'smartphone',
  'tutoring-and-languages': 'maths',
  'cooking-and-baking': 'cooking',
  'care-and-companionship': 'companionship',
  'transport-and-errands': 'moving',
  'arts-crafts-and-music': 'guitar',
  'health-and-fitness': 'yoga',
}

export function skillImage(skill: Pick<Skill, 'title' | 'category'>): string {
  const hit = BY_TITLE.find(([re]) => re.test(skill.title))
  const name = hit?.[1] ?? BY_CATEGORY[skill.category.slug] ?? 'furniture'
  return `/skills/${name}.jpg`
}
