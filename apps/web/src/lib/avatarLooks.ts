export type HairStyle = 'short' | 'long' | 'bob' | 'bun' | 'curly' | 'cap'

export interface Look {
  bg: string
  skin: string
  hair: string
  style: HairStyle
  shirt: string
  glasses?: boolean
  beard?: boolean
}

/** Friendly people for members without a photo. Everyone gets the same one every time. */
export const AVATAR_LOOKS: Record<string, Look> = {
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

/** The characters a member can choose from on their profile. */
export const AVATAR_PICKS = ['pick1', 'pick2', 'pick3', 'pick4', 'pick5', 'pick6', 'sophie', 'kyaw'] as const

const FALLBACK = ['pick1', 'pick2', 'pick3', 'pick4', 'pick5', 'pick6']

/** Stored as "preset:pick3" in the avatar field; anything else is a photo. */
export const presetValue = (key: string) => `preset:${key}`

export function lookFor(name: string, src?: string | null): Look {
  if (src?.startsWith('preset:') && AVATAR_LOOKS[src.slice(7)]) return AVATAR_LOOKS[src.slice(7)]
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  if (AVATAR_LOOKS[first]) return AVATAR_LOOKS[first]
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_LOOKS[FALLBACK[h % FALLBACK.length]]
}
