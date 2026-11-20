import type { HelpRequest, RequestStatus } from '@/types'
import { skills } from './skills'
import { summary } from './users'
import { daysAgo, daysAhead, hoursAgo } from './time'

interface Seed {
  id: number
  requester: number
  skill: number
  hours: number
  message: string
  status: RequestStatus
  created: string
  proposed: string | null
  extra?: Partial<HelpRequest>
}

const make = ({ id, requester, skill, hours, message, status, created, proposed, extra }: Seed): HelpRequest => {
  const s = skills.find((x) => x.id === skill)
  if (!s) throw new Error(`Unknown skill ${skill}`)
  return {
    id,
    skill: { id: s.id, title: s.title },
    requester: summary(requester),
    provider: summary(s.user.id),
    hours,
    credits: hours,
    message,
    status,
    proposed_at: proposed,
    created_at: created,
    responded_at: null,
    provider_done_at: null,
    completed_at: null,
    cancelled_at: null,
    cancel_reason: null,
    reviewed_by_me: false,
    ...extra,
  }
}

const completed = (id: number, requester: number, skill: number, hours: number, createdAgo: number, doneAgo: number, message: string, reviewedByTom = false) =>
  make({
    id, requester, skill, hours, message, status: 'completed',
    created: daysAgo(createdAgo, 9, 30), proposed: daysAgo(createdAgo - 2),
    extra: {
      responded_at: daysAgo(createdAgo, 12, 30),
      provider_done_at: daysAgo(doneAgo, 16),
      completed_at: daysAgo(doneAgo, 18),
      reviewed_by_me: reviewedByTom,
    },
  })

// Ids 1-16 follow DemoDataSeeder. Ids 17-18 are prototype-only so Tom (the signed-in
// demo member) can see the Accept / Decline and Mark done actions.
export const helpRequests: HelpRequest[] = [
  completed(1, 8, 1, 2, 33, 30, 'My gears keep slipping, could you take a look?'),
  completed(2, 3, 3, 1.5, 28, 25, 'I want to automate my club membership spreadsheet.', true),
  completed(3, 6, 9, 1, 24, 21, 'My nephew needs help with algebra before his exam.'),
  completed(4, 7, 13, 2, 21, 18, 'I would love to learn to make mohinga properly.'),
  completed(5, 9, 5, 1, 17, 14, 'Front garden is overgrown, could use a hand.'),
  completed(6, 5, 7, 2.5, 13, 10, 'Moving to a new flat two streets away.', true),
  completed(7, 4, 11, 0.5, 9, 7, 'Please help my mother set up video calls.'),
  completed(8, 8, 2, 1, 6, 3, 'New bookshelf, too many screws!'),
  completed(9, 2, 15, 1, 5, 2, 'Complete beginner, I have my own guitar.'),
  make({ id: 10, requester: 6, skill: 10, hours: 1, message: 'Could we try a morning session?', status: 'pending', created: daysAgo(1), proposed: daysAhead(3, 7, 30) }),
  make({ id: 11, requester: 9, skill: 1, hours: 1, message: 'Squeaky brakes on my cargo bike.', status: 'pending', created: hoursAgo(5), proposed: daysAhead(5) }),
  make({
    id: 12, requester: 3, skill: 6, hours: 1.5, message: 'Preparing for a trip to Lyon.', status: 'accepted',
    created: daysAgo(4), proposed: daysAhead(2, 18), extra: { responded_at: daysAgo(3) },
  }),
  make({
    id: 13, requester: 5, skill: 2, hours: 1, message: 'IKEA desk for my home office.', status: 'awaiting_confirmation',
    created: daysAgo(6), proposed: daysAgo(1, 11), extra: { responded_at: daysAgo(5), provider_done_at: daysAgo(1, 13) },
  }),
  make({
    id: 14, requester: 4, skill: 12, hours: 2, message: "Pandan chiffon for my daughter's birthday?", status: 'declined',
    created: daysAgo(12), proposed: daysAgo(9, 14), extra: { responded_at: daysAgo(11) },
  }),
  make({
    id: 15, requester: 2, skill: 15, hours: 1, message: 'Could we start this weekend?', status: 'cancelled',
    created: daysAgo(15), proposed: daysAgo(13, 9),
    extra: { cancelled_at: daysAgo(14), cancel_reason: 'Schedule clash, I will re-book later.' },
  }),
  make({
    id: 16, requester: 7, skill: 14, hours: 1, message: 'Practice for a job interview.', status: 'cancelled',
    created: daysAgo(10), proposed: daysAgo(8, 17),
    extra: { responded_at: daysAgo(9), cancelled_at: daysAgo(8, 9), cancel_reason: 'Sorry, I am unwell that day.' },
  }),
  make({
    id: 17, requester: 2, skill: 3, hours: 1, message: 'Could you help me build a simple budget spreadsheet for our community kitchen?',
    status: 'pending', created: hoursAgo(3), proposed: daysAhead(4, 18),
  }),
  make({
    id: 18, requester: 8, skill: 3, hours: 1.5, message: 'I want to learn enough Python to tidy up my garden planting list.',
    status: 'accepted', created: daysAgo(3), proposed: daysAgo(0, 9), extra: { responded_at: daysAgo(2) },
  }),
]
