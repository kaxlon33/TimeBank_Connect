import { scorePassword } from '@/lib/forms'
import { cn } from '@/lib/utils'

const levels = [
  { label: 'Too short', bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Weak', bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Fair', bar: 'bg-star', text: 'text-status-pending' },
  { label: 'Good', bar: 'bg-primary', text: 'text-primary' },
  { label: 'Strong', bar: 'bg-positive', text: 'text-positive' },
]

export function PasswordStrength({ password, id }: { password: string; id: string }) {
  const score = scorePassword(password)
  const level = levels[score]
  return (
    <div id={id} className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn('h-1.5 rounded-full transition-colors duration-200', password && i <= Math.max(score, 1) ? level.bar : 'bg-muted')}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {password ? (
          <>
            Password strength: <span className={cn('font-semibold', level.text)}>{level.label}</span>
          </>
        ) : (
          'At least 8 characters. Mix letters, numbers and symbols for a stronger password.'
        )}
      </p>
    </div>
  )
}
