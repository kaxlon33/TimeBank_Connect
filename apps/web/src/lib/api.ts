/**
 * The app's data layer. Login, sign-up, password reset, skills browse and detail, nearby helpers,
 * notifications, the profile and the reference lists (countries, areas, categories) call the Laravel API.
 * Everything else (requests, credits, skill and profile changes, admin) still returns demo data after a
 * short delay, with the same signatures, and moves to the API one group at a time.
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
  PublicProfile,
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
import { CURRENT_USER_ID, users } from '@/mocks/users'
import { categories, skills, slugify } from '@/mocks/skills'
import { helpRequests } from '@/mocks/requests'
import { adminStats, appSettings, auditLog, notifications, reportedItems, reviews, transactions } from '@/mocks/activity'
import { ApiError, get, post, setUnauthorizedHandler } from './http'
import { readStored, removeStored, writeStored } from './storage'

export { ApiError }

/** The API's single-resource and list responses are wrapped as `{ data: ... }`. */
type Wrapped<T> = { data: T }

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
  /** True while a member is logged in. It is remembered in the browser so a refresh keeps them logged in. */
  signedIn: boolean
  /** Reports waiting for an admin decision (shown on the admin sidebar). */
  openReports: number
}

const listeners = new Set<() => void>()
// The signed-in member is remembered in the browser so a refresh keeps them in; the API confirms it on start-up.
const storedSession = readStored<{ email: string; user?: User } | null>('session', null)
// The real member returned by the API. Pages that are not on the API yet still read the demo data (below),
// which mirrors the seeded database, so a demo account sees the same people on both sides.
let realMe: User | null = storedSession?.user ?? null
let currentUserId: number =
  (storedSession && db.users.find((u) => u.email.toLowerCase() === storedSession.email.toLowerCase())?.id) || CURRENT_USER_ID
const me = (): User => {
  if (realMe) return realMe
  const user = db.users.find((u) => u.id === currentUserId)
  if (!user) throw new Error('Signed-in mock user missing')
  return user
}
let signedIn = storedSession !== null
let unreadCount = 0
let snapshot: SessionSnapshot = { me: me(), unread: unreadCount, signedIn, openReports: db.reported.length }

function setSignedIn(value: boolean, user?: User) {
  signedIn = value
  if (value && user) {
    realMe = user
    currentUserId = db.users.find((u) => u.email.toLowerCase() === user.email.toLowerCase())?.id ?? CURRENT_USER_ID
    writeStored('session', { email: user.email, user })
  } else if (!value) {
    realMe = null
    unreadCount = 0
    removeStored('session')
  }
}

function emit() {
  snapshot = { me: { ...me() }, unread: unreadCount, signedIn, openReports: db.reported.length }
  listeners.forEach((l) => l())
}

function setUnread(list: AppNotification[]) {
  unreadCount = list.filter((n) => !n.read_at).length
  emit()
}

// If the API says the session has ended (for example it expired), show the login page.
setUnauthorizedHandler(() => {
  if (!signedIn) return
  setSignedIn(false)
  emit()
})

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

/** A real API call that still honours the ?state=loading | empty | error review helper. */
async function live<T>(call: () => Promise<T>, empty?: T): Promise<T> {
  const forced = forcedState()
  if (forced === 'loading') return new Promise<T>(() => undefined)
  if (forced === 'error') throw new ApiError('We could not reach the server. Check your connection and try again.', 503)
  if (forced === 'empty' && empty !== undefined) return empty
  return call()
}

async function mutate<T>(make: () => T, delay = 500): Promise<T> {
  await wait(delay)
  const result = make()
  emit()
  return structuredClone(result)
}

/* ---------- auth ---------- */

/** Demo data: when each member last used the app. Two members have been quiet for a while. */
const LAST_ACTIVE_DAYS_AGO: Record<number, number> = { 2: 1, 3: 0, 4: 3, 5: 0, 6: 47, 7: 5, 8: 62, 9: 12, 10: 2 }
const lastActive = (id: number) => new Date(Date.now() - (LAST_ACTIVE_DAYS_AGO[id] ?? 4) * 24 * 60 * 60 * 1000).toISOString()

/** Re-reads the signed-in member (their credit balance changes when a session is confirmed). */
async function refreshMember(): Promise<void> {
  try {
    const { data: user } = await get<Wrapped<User>>('/auth/me')
    setSignedIn(true, user)
    emit()
    void api.getNotifications().catch(() => undefined)
  } catch {
    /* The next page load will refresh it. */
  }
}

export const api = {
  async login(email: string, password: string): Promise<User> {
    let user: User
    try {
      user = (await post<Wrapped<User>>('/auth/login', { email: email.trim(), password })).data
    } catch (err) {
      // The login form shows one message ("Email or password is incorrect"), not a per-field error.
      if (err instanceof ApiError && err.errors.email) throw new ApiError(err.errors.email, err.status)
      throw err
    }
    setSignedIn(true, user)
    emit()
    void api.getNotifications().catch(() => undefined) // fills the unread badge
    return user
  },

  async logout(): Promise<void> {
    try {
      await post('/auth/logout')
    } catch {
      /* Signing out here must always work, even if the server cannot be reached. */
    }
    setSignedIn(false)
    emit()
  },

  /** Asks the API who is signed in. Keeps a remembered member signed in, or signs them out if the session ended. */
  async restoreSession(): Promise<void> {
    if (!signedIn) return
    try {
      const { data: user } = await get<Wrapped<User>>('/auth/me')
      setSignedIn(true, user)
      emit()
      void api.getNotifications().catch(() => undefined)
    } catch (err) {
      // Only a 401 (handled globally) ends the session. A network error keeps the remembered member.
      if (err instanceof ApiError && err.status === 401) return
    }
  },

  /** Always succeeds, so nobody can use this to find out which emails have an account. */
  async requestPasswordReset(email: string): Promise<{ email: string }> {
    return post<{ email: string }>('/auth/forgot-password', { email: email.trim() })
  },

  async resetPassword(input: { token: string; email: string; password: string }): Promise<void> {
    await post('/auth/reset-password', input)
  },

  async checkEmail(email: string): Promise<{ available: boolean }> {
    return get<{ available: boolean }>('/auth/check-email', { query: { email: email.trim() } })
  },

  async register(input: RegisterInput): Promise<User> {
    const { data: user } = await post<Wrapped<User>>('/auth/register', {
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      country_code: input.country_code,
      area_name: input.area_name.trim(),
    })
    setSignedIn(true, user)
    emit()
    return user
  },

  /* ---------- geography ---------- */

  async getCountries(): Promise<Country[]> {
    return live(async () => (await get<Wrapped<Country[]>>('/countries')).data)
  },

  async searchAreas(q: string, countryCode: string, signal?: AbortSignal): Promise<Area[]> {
    return (await get<Wrapped<Area[]>>('/areas', { query: { q: q.trim(), country_code: countryCode }, signal })).data
  },

  /* ---------- skills ---------- */

  async getCategories(): Promise<SkillCategory[]> {
    return live(async () => (await get<Wrapped<SkillCategory[]>>('/categories')).data)
  },

  async searchSkills(params: SkillSearchParams, signal?: AbortSignal): Promise<Skill[]> {
    return live(
      async () => (await get<Wrapped<Skill[]>>('/skills', { query: { q: params.q?.trim(), category: params.category }, signal })).data,
      [],
    )
  },

  async getSkill(id: ID): Promise<{ skill: Skill; helper: PublicProfile; reviews: Review[] }> {
    return live(async () => (await get<Wrapped<{ skill: Skill; helper: PublicProfile; reviews: Review[] }>>(`/skills/${id}`)).data)
  },

  // Still on demo data: creating, editing and deleting skills is not on the API yet, and the list must match those writes.
  getMySkills(): Promise<Skill[]> {
    return respond(() => db.skills.filter((s) => s.user.id === currentUserId && s.status !== 'removed'), { empty: [] })
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
        image_url: input.image_url ?? null,
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
        ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
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

  async getRequests(box: 'received' | 'sent'): Promise<HelpRequest[]> {
    return live(async () => (await get<Wrapped<HelpRequest[]>>('/help-requests', { query: { box } })).data, [])
  },

  async createRequest(skillId: ID, hours: number, message: string, proposedAt: string | null): Promise<HelpRequest> {
    const { data } = await post<Wrapped<HelpRequest>>('/help-requests', {
      skill_id: skillId,
      hours,
      message,
      proposed_at: proposedAt,
    })
    return data
  },

  async respondToRequest(id: ID, action: 'accept' | 'decline' | 'mark_done' | 'cancel'): Promise<HelpRequest> {
    const path = action === 'mark_done' ? 'mark-done' : action
    const { data } = await post<Wrapped<HelpRequest>>(`/help-requests/${id}/${path}`)
    return data
  },

  /** Money-like action: never optimistic, the UI waits for this to resolve. The server moves the credits. */
  async confirmRequest(id: ID): Promise<HelpRequest> {
    const { data } = await post<Wrapped<HelpRequest>>(`/help-requests/${id}/complete`)
    await refreshMember() // the balance in the header changed
    return data
  },

  async submitReview(requestId: ID, rating: number, comment: string): Promise<Review> {
    const { data } = await post<Wrapped<Review>>(`/help-requests/${requestId}/reviews`, { rating, comment })
    return data
  },

  /* ---------- credits & notifications ---------- */

  async getTransactions(): Promise<CreditTransaction[]> {
    return live(async () => (await get<Wrapped<CreditTransaction[]>>('/credits/transactions')).data, [])
  },

  async getNotifications(): Promise<AppNotification[]> {
    const list = await live(async () => (await get<Wrapped<AppNotification[]>>('/notifications')).data, [])
    setUnread(list)
    return list
  },

  async markNotificationRead(id: string): Promise<void> {
    await post(`/notifications/${id}/read`)
    void api.getNotifications().catch(() => undefined)
  },

  async markNotificationUnread(id: string): Promise<void> {
    await post(`/notifications/${id}/unread`)
    void api.getNotifications().catch(() => undefined)
  },

  async markAllNotificationsUnread(): Promise<void> {
    await post('/notifications/unread-all')
    void api.getNotifications().catch(() => undefined)
  },

  async markAllNotificationsRead(): Promise<void> {
    await post('/notifications/read-all')
    void api.getNotifications().catch(() => undefined)
  },

  /* ---------- profile ---------- */

  // Saving profile changes is not on the API yet: edits show for this visit and are not stored.
  async getMe(): Promise<{ user: User; reviews: Review[] }> {
    return live(async () => {
      const { data } = await get<Wrapped<{ user: User; reviews: Review[] }>>('/profile')
      const edited = realMe
      // Keep what the member just changed on screen (edits are session-only until the profile endpoints exist).
      const user = edited
        ? {
            ...data.user,
            name: edited.name,
            bio: edited.bio,
            area: edited.area,
            avatar_url: edited.avatar_url,
            availability: edited.availability,
          }
        : data.user
      return { user, reviews: data.reviews }
    })
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

  async getNearbyHelpers(position: { lat: number; lng: number }, radiusKm: number): Promise<NearbyHelper[]> {
    return live(
      async () =>
        (
          await get<Wrapped<NearbyHelper[]>>('/nearby', {
            query: { lat: position.lat, lng: position.lng, radius_km: Math.min(Math.max(radiusKm, 1), 200) },
          })
        ).data,
      [],
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
          .filter(
            (u) =>
              !term ||
              u.name.toLowerCase().includes(term) ||
              u.email.includes(term) ||
              (u.area?.name.toLowerCase().includes(term) ?? false),
          )
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar_url: u.avatar_url,
            last_active_at: lastActive(u.id),
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
    return respond(() => ({ reported: db.reported, skills: db.skills, reviews: db.reviews, audit: db.audit }), {
      empty: { reported: [], skills: [], reviews: [], audit: [] },
    })
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
      db.audit.unshift({
        id: newId(),
        action: `${kind}.${action}`,
        actor: 'Admin User',
        target,
        reason,
        created_at: new Date().toISOString(),
      })
      // A removed item no longer needs a decision.
      if (action === 'remove') db.reported = db.reported.filter((r) => !(r.kind === kind && r.target_id === id))
    }, 450)
  },

  /** Keeps the content and closes the report. */
  dismissReport(id: ID): Promise<void> {
    return mutate(() => {
      const report = db.reported.find((r) => r.id === id)
      if (!report) throw new ApiError('Report not found', 404)
      db.reported = db.reported.filter((r) => r.id !== id)
      db.audit.unshift({
        id: newId(),
        action: 'report.dismiss',
        actor: 'Admin User',
        target: report.title,
        reason: 'Reviewed and kept: no rule broken.',
        created_at: new Date().toISOString(),
      })
    }, 400)
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
