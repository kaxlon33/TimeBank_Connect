import type { AdminStats, AppNotification, AppSettings, CreditTransaction, ReportedItem, Review } from '@/types'
import { daysAgo, hoursAgo } from './time'

// Tom's ledger: starter grant, earned 1.5 from Daniel (c2), spent 2.5 with Hassan (c6). Balance 2.
export const transactions: CreditTransaction[] = [
  {
    id: 12, type: 'session_debit', amount: -2.5, balance_after: 2, counterparty: { id: 9, name: 'Hassan Ali' },
    help_request_id: 6, skill_title: 'Help moving boxes (I have a van)', note: null, created_at: daysAgo(10, 18),
  },
  {
    id: 5, type: 'session_credit', amount: 1.5, balance_after: 4.5, counterparty: { id: 3, name: 'Daniel Okafor' },
    help_request_id: 2, skill_title: 'Python and spreadsheet tutoring', note: null, created_at: daysAgo(25, 18),
  },
  {
    id: 4, type: 'starter_grant', amount: 3, balance_after: 3, counterparty: null,
    help_request_id: null, skill_title: null, note: 'Welcome starter credit', created_at: daysAgo(45, 10, 1),
  },
]

export const notifications: AppNotification[] = [
  {
    id: '9', type: 'request_received', title: 'New request from Aye Chan',
    body: 'Python and spreadsheet tutoring, 1 hour', link: '/requests?tab=received', read_at: null, created_at: hoursAgo(3),
  },
  {
    id: '8', type: 'request_marked_done', title: 'Daniel marked your session as done',
    body: 'Flat-pack furniture assembly. Confirm to send 1 credit.', link: '/requests?tab=sent', read_at: null, created_at: daysAgo(1, 13),
  },
  {
    id: '7', type: 'request_accepted', title: 'You accepted Sophie’s request',
    body: 'Python and spreadsheet tutoring, 1.5 hours', link: '/requests?tab=received', read_at: daysAgo(2), created_at: daysAgo(2),
  },
  {
    id: '6', type: 'review_received', title: 'Hassan left you a 4 star review',
    body: '“Well organised, boxes were all labelled.”', link: '/profile', read_at: daysAgo(8), created_at: daysAgo(9, 14),
  },
  {
    id: '5', type: 'request_completed', title: 'Session completed with Hassan',
    body: '2.5 credits sent for Help moving boxes.', link: '/credits', read_at: daysAgo(10), created_at: daysAgo(10, 18),
  },
  {
    id: '4', type: 'badge_awarded', title: 'You earned the First Exchange badge',
    body: 'Thanks for helping a neighbour for the first time.', link: '/profile', read_at: daysAgo(24), created_at: daysAgo(25, 18),
  },
]

export const reviews: Review[] = [
  [1, 1, 8, 'Sophie Martin', 3, 'Daniel Okafor', 5, 'Fixed my gears and showed me how to adjust them myself.', 30],
  [2, 1, 3, 'Daniel Okafor', 8, 'Sophie Martin', 5, 'Friendly and on time. Lovely to meet a neighbour.', 30],
  [3, 2, 3, 'Daniel Okafor', 5, 'Tom Fletcher', 4, 'Clear explanations, a little rushed at the end.', 25],
  [4, 2, 5, 'Tom Fletcher', 3, 'Daniel Okafor', 5, 'Quick learner, great questions.', 25],
  [5, 3, 6, 'Mei Lin Tan', 4, 'Priya Raman', 5, 'My nephew finally understands equations.', 21],
  [6, 3, 4, 'Priya Raman', 6, 'Mei Lin Tan', 5, 'Very welcoming, thank you!', 21],
  [7, 4, 7, 'Kyaw Zin Htet', 2, 'Aye Chan', 5, 'Best mohinga lesson ever.', 18],
  [8, 5, 9, 'Hassan Ali', 8, 'Sophie Martin', 4, 'Garden looks tidy again. Thanks Sophie.', 14],
  [9, 6, 5, 'Tom Fletcher', 9, 'Hassan Ali', 5, 'Moved everything in one trip. Brilliant.', 10],
  [10, 6, 9, 'Hassan Ali', 5, 'Tom Fletcher', 4, 'Well organised, boxes were all labelled.', 10],
  [11, 7, 4, 'Priya Raman', 6, 'Mei Lin Tan', 5, 'So patient with my mother.', 7],
  [12, 8, 8, 'Sophie Martin', 3, 'Daniel Okafor', 5, 'Bookshelf is solid. Daniel is a star.', 3],
  [13, 4, 2, 'Aye Chan', 7, 'Kyaw Zin Htet', 1, 'Rude personal remark (demo of a removed review).', 18],
].map(([id, hr, rid, rname, eid, ename, rating, comment, ago]): Review => ({
  id: id as number,
  help_request_id: hr as number,
  reviewer: { id: rid as number, name: rname as string },
  reviewee: { id: eid as number, name: ename as string },
  rating: rating as number,
  comment: comment as string,
  status: id === 13 ? 'removed' : 'visible',
  report_count: id === 13 ? 2 : 0,
  created_at: daysAgo((ago as number) - 1, 14),
}))

export const reportedItems: ReportedItem[] = [
  {
    id: 1, kind: 'skill', target_id: 17, title: 'Cheap followers fast!!!', excerpt: 'Message me for social media followers.',
    author: 'Ryan Cole', reason: 'Spam: not a skill exchange.', reports: 4, created_at: daysAgo(6),
  },
  {
    id: 2, kind: 'review', target_id: 13, title: 'Review of Kyaw Zin Htet', excerpt: 'Rude personal remark (demo of a removed review).',
    author: 'Aye Chan', reason: 'Personal attack', reports: 2, created_at: daysAgo(16),
  },
]

export const auditLog = [
  { id: 3, action: 'member.suspend', actor: 'Admin User', target: 'Ryan Cole', reason: 'Posted spam and repeatedly ignored requests (demo data).', created_at: daysAgo(5) },
  { id: 2, action: 'skill.remove', actor: 'Admin User', target: 'Cheap followers fast!!!', reason: 'Spam: not a skill exchange.', created_at: daysAgo(5) },
  { id: 1, action: 'review.remove', actor: 'Admin User', target: 'Review of Kyaw Zin Htet', reason: 'Personal attack: breaks community guidelines.', created_at: daysAgo(15) },
]

export const adminStats: AdminStats = {
  total_members: 9,
  active_members: 8,
  suspended_members: 1,
  completed_sessions: 9,
  credits_in_circulation: 27,
  starter_credits_issued: 27,
  popular_skills: [
    { title: 'Bicycle repair and tune-ups', category: 'Repairs and DIY', requests: 2 },
    { title: 'Flat-pack furniture assembly', category: 'Repairs and DIY', requests: 2 },
    { title: 'Beginner guitar lessons', category: 'Arts, Crafts and Music', requests: 2 },
    { title: 'Burmese home cooking', category: 'Cooking and Baking', requests: 1 },
    { title: 'Secondary school maths tutoring', category: 'Tutoring and Languages', requests: 1 },
  ],
  sessions_by_week: [
    { week: '6 wk', sessions: 1 },
    { week: '5 wk', sessions: 1 },
    { week: '4 wk', sessions: 2 },
    { week: '3 wk', sessions: 1 },
    { week: '2 wk', sessions: 2 },
    { week: 'This wk', sessions: 2 },
  ],
}

export const appSettings: AppSettings = {
  starter_credit: 3,
  matching: {
    weights: { skill: 40, location: 25, availability: 15, reputation: 20 },
    max_distance_km: 25,
    min_score: 30,
    max_results: 10,
  },
}
