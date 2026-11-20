import { lookFor, type Look } from '@/lib/avatarLooks'
import { cn } from '@/lib/utils'

function Hair({ look }: { look: Look }) {
  const { hair, style } = look
  return (
    <>
      {style === 'short' || style === 'bun' ? (
        <path d="M27 46C26 28 38 22 48 22s22 6 21 24c-3-8-8-12-21-12S30 38 27 46z" fill={hair} />
      ) : null}
      {style === 'bun' ? <circle cx="48" cy="17" r="8" fill={hair} /> : null}
      {style === 'long' || style === 'bob' ? (
        <path d="M27 46C29 28 40 25 48 25s19 3 21 21c-6-8-12-11-21-11s-15 3-21 11z" fill={hair} />
      ) : null}
      {style === 'curly'
        ? ([[32, 35, 7], [42, 28, 8], [54, 28, 8], [64, 35, 7], [48, 24, 8]] as const).map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={hair} />
          ))
        : null}
      {style === 'cap' ? (
        <>
          <path d="M26 41C26 26 36 20 48 20s22 6 22 21z" fill={hair} />
          <rect x="44" y="38" width="32" height="5" rx="2.5" fill={hair} />
        </>
      ) : null}
    </>
  )
}

interface Props {
  name: string
  size?: number
  className?: string
  /** A photo (data or web address) or a chosen character such as "preset:pick3". */
  src?: string | null
}

export function Avatar({ name, size = 40, className, src }: Props) {
  const isPhoto = Boolean(src) && !src?.startsWith('preset:')
  const wrap = cn('inline-block shrink-0 overflow-hidden rounded-full', className)

  if (isPhoto) {
    return (
      <span role="img" aria-label={name} className={wrap} style={{ width: size, height: size }}>
        <img src={src as string} alt="" width={size} height={size} className="size-full object-cover" />
      </span>
    )
  }

  const look = lookFor(name, src)
  return (
    <span role="img" aria-label={name} className={wrap} style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
        <rect width="96" height="96" fill={look.bg} />
        <path d="M12 98c2-20 17-28 36-28s34 8 36 28z" fill={look.shirt} />
        <rect x="42" y="58" width="12" height="16" rx="5" fill={look.skin} />
        {look.style === 'long' ? <rect x="25" y="26" width="46" height="56" rx="22" fill={look.hair} /> : null}
        {look.style === 'bob' ? <rect x="26" y="27" width="44" height="38" rx="19" fill={look.hair} /> : null}
        <circle cx="48" cy="46" r="20" fill={look.skin} />
        <Hair look={look} />
        {look.beard ? (
          <path d="M29 50c1 16 9 20 19 20s18-4 19-20c-4 8-10 11-19 11s-15-3-19-11z" fill={look.hair} />
        ) : null}
        <circle cx="40" cy="48" r="2.4" fill="#2a1a1a" />
        <circle cx="56" cy="48" r="2.4" fill="#2a1a1a" />
        <circle cx="33.5" cy="55" r="4" fill="#f28c94" opacity=".45" />
        <circle cx="62.5" cy="55" r="4" fill="#f28c94" opacity=".45" />
        <path d="M43 56.5q5 5 10 0" fill="none" stroke="#2a1a1a" strokeWidth="1.8" strokeLinecap="round" />
        {look.glasses ? (
          <g fill="none" stroke="#2b2130" strokeWidth="1.7">
            <circle cx="40" cy="48" r="6.5" />
            <circle cx="56" cy="48" r="6.5" />
            <path d="M46.5 48h3" />
          </g>
        ) : null}
      </svg>
    </span>
  )
}
