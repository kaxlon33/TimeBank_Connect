import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Five stars filled to the nearest whole number. Read-only. */
export function StarRating({ value, className }: { value: number; className?: string }) {
  const filled = Math.round(value)
  return (
    <span role="img" aria-label={`${value.toFixed(1)} out of 5 stars`} className={cn('flex gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn('size-4', i < filled ? 'fill-brass-ink text-brass-ink' : 'text-stone-200')}
        />
      ))}
    </span>
  )
}
