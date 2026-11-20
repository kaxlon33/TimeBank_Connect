import { cn } from '@/lib/utils'

/** Clock with an exchange arrow: time that moves between neighbours. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-[10px]',
        inverted ? 'bg-wine-on text-wine-800' : 'bg-wine-700 text-wine-on',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 7.5V12l3 2" />
        <path d="M17 3.5h4v4" stroke={inverted ? 'var(--wine-600)' : 'var(--brass-on-wine)'} />
        <path d="m21 3.5-4.5 4.5" stroke={inverted ? 'var(--wine-600)' : 'var(--brass-on-wine)'} />
      </svg>
    </span>
  )
}

export function Logo({ className, onDark = false, compact = false }: { className?: string; onDark?: boolean; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark inverted={onDark} />
      <span
        className={cn(
          'font-heading text-base leading-none font-bold tracking-[-0.03em] sm:text-lg',
          compact && 'hidden sm:inline',
        )}
      >
        timebank<span className={onDark ? 'text-brass' : 'text-wine-600'}>/connect</span>
      </span>
    </span>
  )
}
