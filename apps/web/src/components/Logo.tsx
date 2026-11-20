import { cn } from '@/lib/utils'

/** A gold coin with a bank and hour marks: time, money and the community bank in one mark. */
export function LogoMark({ className }: { className?: string; inverted?: boolean }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
      className={cn('size-10 shrink-0 rounded-[24%] shadow-[0_6px_14px_-6px_rgb(42_10_20/0.6)]', className)}
    />
  )
}

export function Logo({ className, onDark = false, compact = false }: { className?: string; onDark?: boolean; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
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
