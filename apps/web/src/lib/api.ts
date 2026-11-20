/**
 * Thin data layer for the clickable prototype. Every function returns mock data after a
 * short delay, so pages already handle loading, empty and error states. When the Laravel
 * API is ready, each body becomes a fetch() call with the same signature and return type.
 *
 * Review helper: add ?state=loading | empty | error to any page URL to force that state.
 */
import type {
  AdminMember,
  AvailabilitySlot,
  AdminStats,
  AppNotification,
  AppSettings,
  Area,
  Country,
  CreditTransaction,
  HelpRequest,
  ID,
  NearbyHelper,
  ProfileInput,
  RegisterInput,
  ReportedItem,
  Review,
  Skill,
  SkillCategory,
  SkillInput,
  SkillSearchParams,
  User,
  UserStatus,
} from '@/types'
import { areaSuggestions, countries } from '@/mocks/geo'
import { CURRENT_USER_ID, homeOffsets, users } from '@/mocks/users'
import { categories, skills, slugify } from '@/mocks/skills'
import { helpRequests } from '@/mocks/requests'
import {
  adminStats,
  appSettings,
  auditLog,
  notifications,
  reportedItems,
  reviews,
  transactions,
} from '@/mocks/activity'
import { distanceKm } from './format'

export class ApiError extends Error {
  status: number
  errors: Record<string, string>
  constructor(message: string, status = 422, errors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

const db = {
  users: structuredClone(users),
  skills: structuredClone(skills),
  categories: structuredClone(categories),
  requests: structuredClone(helpRequests),
  transactions: structuredClone(transactions),
  notifications: structuredClone(notifications),
  reviews: structuredClone(reviews),
  reported: structuredClone(reportedItems),
  audit: structuredClone(auditLog),
  settings: structuredClone(appSettings),
}

let nextId = 1000
const newId = () => ++nextId

/* ---------- session store (header balance + unread count) ---------- */

export interface SessionSnapshot {
  me: User
  unread: number
}

const listeners = new Set<() => void>()
const me = () => {
  const user = db.users.find((u) => u.id === CURRENT_USER_ID)
  if (!user) throw new Error('Signed-in mock user missing')
  return user
}
let snapshot: SessionSnapshot = { me: me(), unread: db.notifications.filter((n) => !n.read_at).length }

function emit() {
  snapshot = { me: { ...me() }, unread: db.notifications.filter((n) => !n.read_at).length }
  listeners.forEach((l) => l())
}

export const sessionStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => snapshot,
}

/* ---------- helpers ---------- */

type ForcedState = 'loading' | 'empty' | 'error' | null

function forcedState(): ForcedState {
  const s = new URLSearchParams(window.location.search).get('state')
  return s === 'loading' || s === 'empty' || s === 'error' ? s : null
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

interface RespondOptions<T> {
  empty?: T
  delay?: number
  signal?: AbortSignal
}

async function respond<T>(make: () => T, { empty, delay = 450, signal }: RespondOptions<T> = {}): Promise<T> {
  const forced = forcedState()
  if (forced === 'loading') return new Promise<T>(() => undefined)
  await wait(delay + Math.random() * 200, signal)
  if (forced === 'error') throw new ApiError('We could not reach the server. Check your connection and try again.', 503)
  if (forced === 'empty' && empty !== undefined) return empty
  return structuredClone(make())
}

async function mutate<T>(make: () => T, delay = 500): Promise<T> {
  await wait(delay)
  const result = make()
  emit()
  return structuredClone(result)
}

function notify(n: Omit<AppNotification, 'id' | 'read_at' | 'created_at'>) {
  db.notifications.unshift({ ...n, id: newId(), read_at: null, created_at: new Date().toISOString() })
}

function findRequest(id: ID): HelpRequest {
  const r = db.requests.find((x) => x.id === id)
  if (!r) throw new ApiError('Request not found', 404)
  return r
}

/* ---------- auth ---------- */

export const api = {
  async login(email: string, password: string): Promise<User> {
    await wait(600)
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || password !== 'password') throw new ApiError('Email or password is incorrect', 422)
    if (user.status === 'suspended') throw new ApiError('This account has been suspended. Contact the TimeBank team for help.', 403)
    return structuredClone(user)
  },

  async checkEmail(email: string): Promise<{ available: boolean }> {
    await wait(350)
    return { available: !db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()) }
  },

  async register(input: RegisterInput): Promise<User> {
    await wait(700)
    if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiError('Please fix the highlighted fields.', 422, { email: 'This email is already registered.' })
    }
    return { ...structuredClone(me()), name: input.name, email: input.email, credit_balance: db.settings.starter_credit }
  },

  /* ---------- geography ---------- */

  getCountries(): Promise<Country[]> {
    return respond(() => countries, { delay: 150 })
  },

  searchAreas(q: string, countryCode: string, signal?: AbortSignal): Promise<Area[]> {
    const term = q.trim().toLowerCase()
    return respond(
      () =>
        areaSuggestions
          .filter((a) => (!countryCode || a.country_code === countryCode) && a.name.toLowerCase().includes(term))
          .slice(0, 5),
      { delay: 300, signal },
    )
  },

  /* ---------- skills ---------- */

  getCategories(): Promise<SkillCategory[]> {
    return respond(() => db.categories.filter((c) => c.is_active), { delay: 150 })
  },

  searchSkills(params: SkillSearchParams, signal?: AbortSignal): Promise<Skill[]> {
    const q = (params.q ?? '').trim().toLowerCase()
    return respond(
      () =>
        db.skills
          .filter((s) => s.status === 'active' && s.user.id !== CURRENT_USER_ID)
          .filter((s) => !params.category || s.category.slug === params.category)
          .filter(
            (s) =>
              !q ||
              s.title.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              s.user.name.toLowerCase().includes(q) ||
              (s.user.area?.name.toLowerCase().includes(q) ?? false),
          )
          .sort((a, b) => b.user.trust_score - a.user.trust_score),
      { empty: [], signal, delay: 400 },
    )
  },

  getSkill(id: ID): Promise<{ skill: Skill; helper: User; reviews: Review[] }> {
    return respond(() => {
      const skill = db.skills.find((s) => s.id === id && s.status !== 'removed')
      if (!skill) throw new ApiError('This skill is no longer available.', 404)
      const helper = db.users.find((u) => u.id === skill.user.id)
      if (!helper) throw new ApiError('Helper not found', 404)
      return {
        skill,
        helper,
        reviews: db.reviews.filter((r) => r.reviewee.id === helper.id && r.status === 'visible'),
      }
    })
  },

  getMySkills(): Promise<Skill[]> {
    return respond(() => db.skills.filter((s) => s.user.id === CURRENT_USER_ID && s.status !== 'removed'), { empty: [] })
  },

  createSkill(input: SkillInput): Promise<Skill> {
    return mutate(() => {
      const category = db.categories.find((c) => c.id === input.category_id)
      if (!category) throw new ApiError('Choose a category', 422, { category_id: 'Choose a category.' })
      const owner = db.skills.find((s) => s.user.id === CURRENT_USER_ID)?.user
      const skill: Skill = {
        id: newId(),
        title: input.title,
        description: input.description,
        category: { id: category.id, name: category.name, slug: category.slug },
        status: 'active',
        user: owner ?? { ...me(), avatar_url: null },
        created_at: new Date().toISOString(),
        report_count: 0,
      }
      db.skills.unshift(skill)
      return skill
    })
  },

  updateSkill(id: ID, input: SkillInput & { status?: Skill['status'] }): Promise<Skill> {
    return mutate(() => {
      const skill = db.skills.find((s) => s.id === id)
      const category = db.categories.find((c) => c.id === input.category_id)
      if (!skill || !category) throw new ApiError('Skill not found', 404)
      Object.assign(skill, {
        title: input.title,
        description: input.description,
        category: { id: category.id, name: category.name, slug: category.slug },
        status: input.status ?? skill.status,
      })
      return skill
    })
  },

  deleteSkill(id: ID): Promise<void> {
    return mutate(() => {
      db.skills = db.skills.filter((s) => s.id !== id)
    }, 350)
  },

  /* ---------- help requests ---------- */

  getRequests(box: 'received' | 'sent'): Promise<HelpRequest[]> {
    return respond(
      () =>
        db.requests
          .filter((r) => (box === 'received' ? r.provider.id : r.requester.id) === CURRENT_USER_ID)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      { empty: [] },
    )
  },

  createRequest(skillId: ID, hours: number, message: string, proposedAt: string | null): Promise<HelpRequest> {
    return mutate(() => {
      const skill = db.skills.find((s) => s.id === skillId)
      if (!skill) throw new ApiError('Skill not found', 404)
      if (skill.user.id === CURRENT_USER_ID) throw new ApiError('You cannot request your own skill.')
      if (me().credit_balance < hours) {
        throw new ApiError(`You need ${hours} credits but have ${me().credit_balance}.`, 422, { hours: 'Not enough credits.' })
      }
      const request: HelpRequest = {
        id: newId(),
        skill: { id: skill.id, title: skill.title },
        requester: { ...me() },
        provider: skill.user,
        hours,
        credits: hours,
        message,
        status: 'pending',
        proposed_at: proposedAt,
        created_at: new Date().toISOString(),
        responded_at: null,
        provider_done_at: null,
        completed_at: null,
        cancelled_at: null,
        cancel_reason: null,
        reviewed_by_me: false,
      }
      db.requests.unshift(request)
      return request
    }, 650)
  },

  respondToRequest(id: ID, action: 'accept' | 'decline' | 'mark_done' | 'cancel'): Promise<HelpRequest> {
    return mutate(() => {
      const r = findRequest(id)
      const now = new Date().toISOString()
      if (action === 'accept' && r.status === 'pending') Object.assign(r, { status: 'accepted', responded_at: now })
      else if (action === 'decline' && r.status === 'pending') Object.assign(r, { status: 'declined', responded_at: now })
      else if (action === 'mark_done' && r.status === 'accepted') Object.assign(r, { status: 'awaiting_confirmation', provider_done_at: now })
      else if (action === 'cancel' && (r.status === 'pending' || r.status === 'accepted'))
        Object.assign(r, { status: 'cancelled', cancelled_at: now, cancel_reason: 'Cancelled by member' })
      else throw new ApiError('This request has already changed. Refresh to see the latest status.', 409)
      return r
    }, 400)
  },

  /** Money-like action: never optimistic, the UI waits for this to resolve. */
  confirmRequest(id: ID): Promise<HelpRequest> {
    return mutate(() => {
      const r = findRequest(id)
      if (r.status !== 'awaiting_confirmation') throw new ApiError('This session was already confirmed.', 409)
      const user = me()
      if (user.credit_balance < r.credits) throw new ApiError('You do not have enough credits to confirm this session.', 422)
      user.credit_balance = Math.round((user.credit_balance - r.credits) * 100) / 100
      Object.assign(r, { status: 'completed', completed_at: new Date().toISOString() })
      db.transactions.unshift({
        id: newId(),
        type: 'session_debit',
        amount: -r.credits,
        balance_after: user.credit_balance,
        counterparty: { id: r.provider.id, name: r.provider.name },
        help_request_id: r.id,
        skill_title: r.skill.title,
        note: null,
        created_at: new Date().toISOString(),
      })
      notify({
        type: 'request_completed',
        title: `Session completed with ${r.provider.name.split(' ')[0]}`,
        body: `${r.credits} ${r.credits === 1 ? 'credit' : 'credits'} sent for ${r.skill.title}.`,
        link: '/credits',
      })
      return r
    }, 900)
  },

  submitReview(requestId: ID, rating: number, comment: string): Promise<Review> {
    return mutate(() => {
      const r = findRequest(requestId)
      const other = r.requester.id === CURRENT_USER_ID ? r.provider : r.requester
      r.reviewed_by_me = true
      const review: Review = {
        id: newId(),
        help_request_id: r.id,
        reviewer: { id: CURRENT_USER_ID, name: me().name },
        reviewee: { id: other.id, name: other.name },
        rating,
        comment,
        status: 'visible',
        report_count: 0,
        created_at: new Date().toISOString(),
      }
      db.reviews.unshift(review)
      return review
    }, 600)
  },

  /* ---------- credits & notifications ---------- */

  getTransactions(): Promise<CreditTransaction[]> {
    return respond(() => db.transactions, { empty: [] })
  },

  getNotifications(): Promise<AppNotification[]> {
    return respond(() => db.notifications, { empty: [], delay: 300 })
  },

  markNotificationRead(id: ID): Promise<void> {
    return mutate(() => {
      const n = db.notifications.find((x) => x.id === id)
      if (n && !n.read_at) n.read_at = new Date().toISOString()
    }, 150)
  },

  markAllNotificationsRead(): Promise<void> {
    return mutate(() => {
      const now = new Date().toISOString()
      db.notifications.forEach((n) => {
        n.read_at ??= now
      })
    }, 250)
  },

  /* ---------- profile ---------- */

  getMe(): Promise<{ user: User; reviews: Review[] }> {
    return respond(() => ({
      user: me(),
      reviews: db.reviews.filter((r) => r.reviewee.id === CURRENT_USER_ID && r.status === 'visible'),
    }))
  },

  updateProfile(input: ProfileInput, avatarUrl: string | null): Promise<User> {
    return mutate(() => {
      const user = me()
      const area =
        areaSuggestions.find((a) => a.name.toLowerCase() === input.area_name.trim().toLowerCase()) ??
        (input.area_name.trim()
          ? {
              id: newId(),
              name: input.area_name.trim(),
              country_code: input.country_code,
              country_name: countries.find((c) => c.code === input.country_code)?.name ?? input.country_code,
              latitude: 0,
              longitude: 0,
            }
          : user.area)
      Object.assign(user, { name: input.name, bio: input.bio, area, avatar_url: avatarUrl })
      return user
    }, 700)
  },

  updateAvailability(slots: AvailabilitySlot[]): Promise<User> {
    return mutate(() => {
      const user = me()
      user.availability = slots.map((s) => ({ ...s }))
      return user
    }, 600)
  },

  /* ---------- nearby ---------- */

  getNearbyHelpers(position: { lat: number; lng: number }, radiusKm: number): Promise<NearbyHelper[]> {
    return respond(
      () =>
        db.users
          .filter((u) => u.role === 'member' && u.status === 'active' && u.id !== CURRENT_USER_ID && u.area)
          .map((u) => {
            const [dLat, dLng] = homeOffsets[u.id] ?? [0, 0]
            const lat = (u.area?.latitude ?? 0) + dLat
            const lng = (u.area?.longitude ?? 0) + dLng
            return {
              user: { ...u },
              distance_km: distanceKm(position.lat, position.lng, lat, lng),
              skills: db.skills
                .filter((s) => s.user.id === u.id && s.status === 'active')
                .map((s) => ({ id: s.id, title: s.title })),
            }
          })
          .filter((h) => h.distance_km <= radiusKm)
          .sort((a, b) => a.distance_km - b.distance_km),
      { empty: [], delay: 500 },
    )
  },

  /* ---------- admin ---------- */

  getAdminStats(): Promise<AdminStats> {
    return respond(() => adminStats, { delay: 550 })
  },

  getAdminMembers(q: string, signal?: AbortSignal): Promise<AdminMember[]> {
    const term = q.trim().toLowerCase()
    return respond(
      () =>
        db.users
          .filter((u) => u.role === 'member')
          .filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.includes(term) || (u.area?.name.toLowerCase().includes(term) ?? false))
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            area: u.area,
            status: u.status,
            credit_balance: u.credit_balance,
            trust_score: u.trust_score,
            completed_sessions: u.completed_sessions,
            joined_at: u.created_at,
            suspended_reason: u.suspended_reason,
          })),
      { empty: [], signal, delay: 350 },
    )
  },

  setMemberStatus(id: ID, status: UserStatus, reason: string | null): Promise<void> {
    return mutate(() => {
      const user = db.users.find((u) => u.id === id)
      if (!user) throw new ApiError('Member not found', 404)
      user.status = status
      user.suspended_reason = status === 'suspended' ? reason : null
      db.audit.unshift({
        id: newId(),
        action: status === 'suspended' ? 'member.suspend' : 'member.reactivate',
        actor: 'Admin User',
        target: user.name,
        reason: reason ?? '',
        created_at: new Date().toISOString(),
      })
    }, 450)
  },

  getAdminCategories(): Promise<SkillCategory[]> {
    return respond(() => db.categories, { empty: [], delay: 300 })
  },

  saveCategory(id: ID | null, name: string): Promise<SkillCategory> {
    return mutate(() => {
      if (db.categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== id)) {
        throw new ApiError('A category with this name already exists.', 422, { name: 'Already exists.' })
      }
      if (id) {
        const c = db.categories.find((x) => x.id === id)
        if (!c) throw new ApiError('Category not found', 404)
        Object.assign(c, { name: name.trim(), slug: slugify(name) })
        return c
      }
      const c: SkillCategory = { id: newId(), name: name.trim(), slug: slugify(name), is_active: true, skills_count: 0 }
      db.categories.push(c)
      return c
    }, 400)
  },

  toggleCategory(id: ID): Promise<SkillCategory> {
    return mutate(() => {
      const c = db.categories.find((x) => x.id === id)
      if (!c) throw new ApiError('Category not found', 404)
      c.is_active = !c.is_active
      return c
    }, 300)
  },

  getModeration(): Promise<{ reported: ReportedItem[]; skills: Skill[]; reviews: Review[]; audit: typeof auditLog }> {
    return respond(
      () => ({ reported: db.reported, skills: db.skills, reviews: db.reviews, audit: db.audit }),
      { empty: { reported: [], skills: [], reviews: [], audit: [] } },
    )
  },

  moderate(kind: 'skill' | 'review', id: ID, action: 'remove' | 'restore', reason: string): Promise<void> {
    return mutate(() => {
      if (kind === 'skill') {
        const s = db.skills.find((x) => x.id === id)
        if (s) s.status = action === 'remove' ? 'removed' : 'active'
      } else {
        const r = db.reviews.find((x) => x.id === id)
        if (r) r.status = action === 'remove' ? 'removed' : 'visible'
      }
      const target =
        kind === 'skill'
          ? (db.skills.find((x) => x.id === id)?.title ?? 'Skill')
          : `Review by ${db.reviews.find((x) => x.id === id)?.reviewer.name ?? 'member'}`
      db.audit.unshift({ id: newId(), action: `${kind}.${action}`, actor: 'Admin User', target, reason, created_at: new Date().toISOString() })
    }, 450)
  },

  getSettings(): Promise<AppSettings> {
    return respond(() => db.settings, { delay: 300 })
  },

  saveSettings(settings: AppSettings): Promise<AppSettings> {
    return mutate(() => {
      const w = settings.matching.weights
      if (w.skill + w.location + w.availability + w.reputation !== 100) {
        throw new ApiError('Matching weights must add up to 100.', 422, { weights: 'Must total 100.' })
      }
      db.settings = structuredClone(settings)
      return db.settings
    }, 550)
  },
}
