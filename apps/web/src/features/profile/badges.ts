import { BadgeCheck, Heart, ShieldCheck, Sparkles, Star, Users, type LucideIcon } from 'lucide-react'
import type { BadgeCode } from '@/types'

export const badgeIcons: Record<BadgeCode, LucideIcon> = {
  first_exchange: Sparkles,
  helping_hand: Heart,
  community_builder: Users,
  top_rated: Star,
  reliable: ShieldCheck,
  trusted_member: BadgeCheck,
}

/** Every badge a member can earn, with a plain-English way to get it. */
export const BADGES: { code: BadgeCode; name: string; requirement: string }[] = [
  { code: 'first_exchange', name: 'First Exchange', requirement: 'Complete your first session' },
  { code: 'helping_hand', name: 'Helping Hand', requirement: 'Help 5 neighbours' },
  { code: 'community_builder', name: 'Community Builder', requirement: 'Complete 10 sessions' },
  { code: 'top_rated', name: 'Top Rated', requirement: '5 reviews averaging 4.5 or more' },
  { code: 'reliable', name: 'Reliable', requirement: 'Finish 90% of requests you accept' },
  { code: 'trusted_member', name: 'Trusted Member', requirement: 'Trust score 80 with 5 sessions' },
]
