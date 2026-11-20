import type { AvailabilitySlot, Badge, User, UserSummary } from '@/types'
import { areas } from './geo'
import { daysAgo } from './time'

export const badgeCatalog: Badge[] = [
  { code: 'first_exchange', name: 'First Exchange', description: 'Completed a first session, as helper or as requester.' },
  { code: 'helping_hand', name: 'Helping Hand', description: 'Completed 5 sessions as a helper.' },
  { code: 'community_builder', name: 'Community Builder', description: 'Completed 10 sessions in total.' },
  { code: 'top_rated', name: 'Top Rated', description: 'At least 5 reviews with an average rating of 4.5 or more.' },
  { code: 'reliable', name: 'Reliable', description: 'Accepted at least 5 requests and completed 90% or more of them.' },
  { code: 'trusted_member', name: 'Trusted Member', description: 'Trust score of 80 or more with at least 5 completed sessions.' },
]

const firstExchange = (awardedDaysAgo: number): Badge => ({
  ...badgeCatalog[0],
  awarded_at: daysAgo(awardedDaysAgo, 18),
})

const slot = (weekday: AvailabilitySlot['weekday'], start_time: string, end_time: string): AvailabilitySlot => ({
  weekday,
  start_time,
  end_time,
})

// Balances, trust scores and ratings follow the seeded ledger and reviews exactly.
export const users: User[] = [
  {
    id: 1, name: 'Admin User', email: 'admin@timebank.test', role: 'admin', status: 'active',
    bio: 'TimeBank Connect administrator.', area: areas.camden, avatar_url: null,
    credit_balance: 0, trust_score: 0, completed_sessions: 0, rating_avg: null, rating_count: 0,
    badges: [], availability: [], created_at: daysAgo(60), suspended_reason: null,
  },
  {
    id: 2, name: 'Aye Chan', email: 'aye@timebank.test', role: 'member', status: 'active',
    bio: 'Home cook and English teacher. Happy to share Burmese recipes.', area: areas.bahan, avatar_url: null,
    credit_balance: 4, trust_score: 60.44, completed_sessions: 2, rating_avg: 5, rating_count: 1,
    badges: [firstExchange(18)], availability: [slot(6, '15:00', '18:00'), slot(0, '09:00', '12:00')],
    created_at: daysAgo(50), suspended_reason: null,
  },
  {
    id: 3, name: 'Daniel Okafor', email: 'daniel@timebank.test', role: 'member', status: 'active',
    bio: 'Cyclist and weekend fixer. If it has bolts, I can probably help.', area: areas.camden, avatar_url: null,
    credit_balance: 4.5, trust_score: 73.63, completed_sessions: 3, rating_avg: 5, rating_count: 3,
    badges: [firstExchange(30)], availability: [slot(6, '09:00', '13:00'), slot(0, '10:00', '16:00')],
    created_at: daysAgo(48), suspended_reason: null,
  },
  {
    id: 4, name: 'Priya Raman', email: 'priya@timebank.test', role: 'member', status: 'active',
    bio: 'Maths tutor and yoga lover.', area: areas.tampines, avatar_url: null,
    credit_balance: 3.5, trust_score: 67.94, completed_sessions: 2, rating_avg: 5, rating_count: 1,
    badges: [firstExchange(21)], availability: [slot(1, '17:00', '20:00'), slot(6, '07:00', '09:00')],
    created_at: daysAgo(46), suspended_reason: null,
  },
  {
    id: 5, name: 'Tom Fletcher', email: 'tom@timebank.test', role: 'member', status: 'active',
    bio: 'Software developer who enjoys teaching beginners.', area: areas.hackney, avatar_url: null,
    credit_balance: 2, trust_score: 65.75, completed_sessions: 2, rating_avg: 4, rating_count: 2,
    badges: [firstExchange(25)], availability: [slot(2, '18:00', '21:00'), slot(4, '18:00', '21:00')],
    created_at: daysAgo(45), suspended_reason: null,
  },
  {
    id: 6, name: 'Mei Lin Tan', email: 'mei@timebank.test', role: 'member', status: 'active',
    bio: 'Patient with technology and with dough.', area: areas.bedok, avatar_url: null,
    credit_balance: 2.5, trust_score: 70.75, completed_sessions: 2, rating_avg: 5, rating_count: 2,
    badges: [firstExchange(21)], availability: [slot(0, '14:00', '17:00'), slot(5, '18:00', '20:00')],
    created_at: daysAgo(44), suspended_reason: null,
  },
  {
    id: 7, name: 'Kyaw Zin Htet', email: 'kyaw@timebank.test', role: 'member', status: 'active',
    bio: 'Guitar player; I visit older neighbours on weekends.', area: areas.sanchaung, avatar_url: null,
    credit_balance: 2, trust_score: 63.25, completed_sessions: 2, rating_avg: null, rating_count: 0,
    badges: [firstExchange(18)], availability: [slot(0, '09:00', '12:00'), slot(3, '18:00', '20:00')],
    created_at: daysAgo(42), suspended_reason: null,
  },
  {
    id: 8, name: 'Sophie Martin', email: 'sophie@timebank.test', role: 'member', status: 'active',
    bio: 'Gardener and French speaker.', area: areas.camden, avatar_url: null,
    credit_balance: 1, trust_score: 69.25, completed_sessions: 3, rating_avg: 4.5, rating_count: 2,
    badges: [firstExchange(30)], availability: [slot(6, '10:00', '14:00'), slot(3, '17:00', '19:00')],
    created_at: daysAgo(40), suspended_reason: null,
  },
  {
    id: 9, name: 'Hassan Ali', email: 'hassan@timebank.test', role: 'member', status: 'active',
    bio: 'I have a van and free Saturday mornings.', area: areas.hackney, avatar_url: null,
    credit_balance: 4.5, trust_score: 67.94, completed_sessions: 2, rating_avg: 5, rating_count: 1,
    badges: [firstExchange(14)], availability: [slot(6, '08:00', '12:00')],
    created_at: daysAgo(38), suspended_reason: null,
  },
  {
    id: 10, name: 'Ryan Cole', email: 'ryan@timebank.test', role: 'member', status: 'suspended',
    bio: 'Demo account that was suspended by an admin.', area: areas.hackney, avatar_url: null,
    credit_balance: 3, trust_score: 61.25, completed_sessions: 0, rating_avg: null, rating_count: 0,
    badges: [], availability: [], created_at: daysAgo(35),
    suspended_reason: 'Posted spam and repeatedly ignored requests (demo data).',
  },
]

export const CURRENT_USER_ID = 5

export function userById(id: number): User {
  const user = users.find((u) => u.id === id)
  if (!user) throw new Error(`Unknown mock user ${id}`)
  return user
}

export function summary(id: number): UserSummary {
  const { name, avatar_url, area, trust_score, completed_sessions, rating_avg, rating_count } = userById(id)
  return { id, name, avatar_url, area, trust_score, completed_sessions, rating_avg, rating_count }
}

// Small offsets so helpers in the same area are not all at the same point on the map.
export const homeOffsets: Record<number, [number, number]> = {
  2: [0.004, -0.006], 3: [0.003, 0.004], 4: [-0.002, 0.003], 5: [0, 0], 6: [0.004, -0.002],
  7: [-0.003, 0.002], 8: [-0.006, -0.008], 9: [0.009, 0.012], 10: [-0.004, 0.006],
}
