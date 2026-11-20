/** Plain-English names for the actions recorded in the admin log. */
const labels: Record<string, string> = {
  'member.suspend': 'Suspended a member',
  'member.reactivate': 'Reactivated a member',
  'skill.remove': 'Removed a skill',
  'skill.restore': 'Restored a skill',
  'review.remove': 'Removed a review',
  'review.restore': 'Restored a review',
  'report.dismiss': 'Dismissed a report',
}

export function actionLabel(action: string): string {
  return labels[action] ?? action
}

/** Red for actions that take something away, green for ones that give it back. */
export function actionTone(action: string): 'bad' | 'good' | 'neutral' {
  if (/suspend|remove/.test(action)) return 'bad'
  if (/reactivate|restore/.test(action)) return 'good'
  return 'neutral'
}
