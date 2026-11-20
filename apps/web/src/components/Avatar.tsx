import { cn } from '@/lib/utils'

type HairStyle = 'short' | 'long' | 'bob' | 'bun' | 'curly' | 'cap'

interface Look {
  bg: string
  skin: string
  hair: string
  style: HairStyle
  shirt: string
  glasses?: boolean
  beard?: boolean
}

/** Friendly people for members without a photo. Everyone gets the same one every time. */
const AVATAR_LOOKS: Record<string, Look> = {
  tom: { bg: '#cfe0f5', skin: '#f1c9a5', hair: '#2b2130', style: 'short', shirt: '#5e1a2b', glasses: true },
  aye: { bg: '#f6d6dd', skin: '#e8b88f', hair: '#1c1418', style: 'long', shirt: '#b9577a' },
  daniel: { bg: '#f5e3b8', skin: '#9b6b4a', hair: '#1b1311', style: 'curly', shirt: '#2e5e4e', beard: true },
  sophie: { bg: '#d6ebdd', skin: '#f6d5bc', hair: '#d9a441', style: 'bob', shirt: '#3e5c9a' },
  mei: { bg: '#d2e0f3', skin: '#f0c9a4', hair: '#241b22', style: 'bun', shirt: '#c9795b' },
  priya: { bg: '#f2d4e5', skin: '#c98f65', hair: '#150f12', style: 'long', shirt: '#7a2236' },
  kyaw: { bg: '#eadfd2', skin: '#d9a87d', hair: '#2a1c16', style: 'short', shirt: '#556b8f' },
  hassan: { bg: '#f3ddb7', skin: '#b97a52', hair: '#1a1210', style: 'cap', shirt: '#3b3b4f', beard: true },
  ryan: { bg: '#f8d9d9', skin: '#f1c9a5', hair: '#6b3e2a', style: 'short', shirt: '#8a8a8a' },
  admin: { bg: '#d9b77e', skin: '#e8b88f', hair: '#2a0a14', style: 'bob', shirt: '#2a0a14' },
  pick1: { bg: '#f9d9c9', skin: '#f6d5bc', hair: '#8a4b2a', style: 'bun', shirt: '#e08a6b' },
  pick2: { bg: '#d5e8f2', skin: '#8d5e3f', hair: '#120c0a', style: 'curly', shirt: '#3f7fa6' },
  pick3: { bg: '#e6daf3', skin: '#f0c9a4', hair: '#4a2f7a', style: 'long', shirt: '#7a5ac8' },
  pick4: { bg: '#ddefd6', skin: '#e8b88f', hair: '#2a1c16', style: 'cap', shirt: '#4b8b5a' },
  pick5: { bg: '#fbe3ec', skin: '#f6d5bc', hair: '#e5a9b8', style: 'bob', shirt: '#d86a90', glasses: true },
  pick6: { bg: '#fff0c9', skin: '#c98f65', hair: '#1b1311', style: 'short', shirt: '#e0a93b', beard: true },
}

const FALLBACK = ['pick1', 'pick2', 'pick3', 'pick4', 'pick5', 'pick6']

function lookFor(name: string): Look {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  if (AVATAR_LOOKS[first]) return AVATAR_LOOKS[first]
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_LOOKS[FALLBACK[h % FALLBACK.length]]
}

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
}

export function Avatar({ name, size = 40, className }: Props) {
  const look = lookFor(name)
  return (
    <span
      role="img"
      aria-label={name}
      className={cn('inline-block shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
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
