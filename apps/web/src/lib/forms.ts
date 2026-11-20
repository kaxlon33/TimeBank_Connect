/** Points aria-describedby at the error when there is one, otherwise at the hint. */
export function describedBy(id: string, error?: string | null, hint?: unknown) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export function scorePassword(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length < 8) score = Math.min(score, 1)
  return Math.min(4, score)
}
