// Shapes mirror the planned Laravel API Resources (snake_case, ISO date strings).

export type ID = number

export type UserRole = 'member' | 'admin'
export type UserStatus = 'active' | 'suspended'
export type SkillStatus = 'active' | 'hidden' | 'removed'
export type ReviewStatus = 'visible' | 'removed'

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'awaiting_confirmation'
  | 'completed'
  | 'declined'
  | 'cancelled'

export type TransactionType = 'starter_grant' | 'session_debit' | 'session_credit' | 'admin_adjustment'

export type NotificationType =
  | 'request_received'
  | 'request_accepted'
  | 'request_declined'
  | 'request_cancelled'
  | 'request_marked_done'
  | 'request_completed'
  | 'review_received'
  | 'badge_awarded'

export type BadgeCode =
  | 'first_exchange'
  | 'helping_hand'
  | 'community_builder'
  | 'top_rated'
  | 'reliable'
  | 'trusted_member'

export interface Country {
  id: ID
  code: string
  name: string
}

export interface Area {
  id: ID
  name: string
  country_code: string
  country_name: string
  latitude: number
  longitude: number
}

export interface Badge {
  code: BadgeCode
  name: string
  description: string
  awarded_at?: string
}

export interface AvailabilitySlot {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string
  end_time: string
}

export interface UserSummary {
  id: ID
  name: string
  avatar_url: string | null
  area: Area | null
  trust_score: number
  completed_sessions: number
  rating_avg: number | null
  rating_count: number
}

export interface User extends UserSummary {
  email: string
  role: UserRole
  status: UserStatus
  bio: string
  credit_balance: number
  badges: Badge[]
  availability: AvailabilitySlot[]
  created_at: string
  suspended_reason: string | null
}

export interface SkillCategory {
  id: ID
  name: string
  slug: string
  is_active: boolean
  skills_count: number
}

export interface Skill {
  id: ID
  title: string
  description: string
  category: Pick<SkillCategory, 'id' | 'name' | 'slug'>
  status: SkillStatus
  user: UserSummary
  created_at: string
  report_count: number
  /** A picture the member uploaded. When empty, a picture is chosen from the title and category. */
  image_url?: string | null
}

export interface SkillInput {
  title: string
  category_id: ID
  description: string
  image_url?: string | null
}

export interface HelpRequest {
  id: ID
  skill: Pick<Skill, 'id' | 'title'>
  requester: UserSummary
  provider: UserSummary
  hours: number
  credits: number
  message: string
  status: RequestStatus
  proposed_at: string | null
  created_at: string
  responded_at: string | null
  provider_done_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  reviewed_by_me: boolean
}

export interface CreditTransaction {
  id: ID
  type: TransactionType
  amount: number
  balance_after: number
  counterparty: Pick<UserSummary, 'id' | 'name'> | null
  help_request_id: ID | null
  skill_title: string | null
  note: string | null
  created_at: string
}

export interface AppNotification {
  id: ID
  type: NotificationType
  title: string
  body: string
  link: string
  read_at: string | null
  created_at: string
}

export interface Review {
  id: ID
  help_request_id: ID
  reviewer: Pick<UserSummary, 'id' | 'name'>
  reviewee: Pick<UserSummary, 'id' | 'name'>
  rating: number
  comment: string
  status: ReviewStatus
  report_count: number
  created_at: string
}

export interface NearbyHelper {
  user: UserSummary
  distance_km: number
  lat: number
  lng: number
  skills: Pick<Skill, 'id' | 'title'>[]
}

export interface AdminStats {
  total_members: number
  active_members: number
  suspended_members: number
  completed_sessions: number
  credits_in_circulation: number
  starter_credits_issued: number
  popular_skills: { title: string; category: string; requests: number }[]
  sessions_by_week: { week: string; sessions: number }[]
}

export interface AdminMember {
  id: ID
  name: string
  email: string
  area: Area | null
  status: UserStatus
  credit_balance: number
  trust_score: number
  completed_sessions: number
  joined_at: string
  suspended_reason: string | null
}

export interface ReportedItem {
  id: ID
  kind: 'skill' | 'review'
  target_id: ID
  title: string
  excerpt: string
  author: string
  reason: string
  reports: number
  created_at: string
}

export interface MatchingWeights {
  skill: number
  location: number
  availability: number
  reputation: number
}

export interface AppSettings {
  starter_credit: number
  matching: {
    weights: MatchingWeights
    max_distance_km: number
    min_score: number
    max_results: number
  }
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export interface SkillSearchParams {
  q?: string
  category?: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  country_code: string
  area_name: string
}

export interface ProfileInput {
  name: string
  bio: string
  country_code: string
  area_name: string
}
