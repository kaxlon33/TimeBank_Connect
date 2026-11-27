/**
 * The app's data layer: every function here calls the Laravel REST API (see ./http for cookies and CSRF)
 * and returns the typed result the pages use.
 *
 * Review helper: add ?state=loading | empty | error to any page URL to force that state.
 */
import type {
  AdminMember,
  AdminModeration,
  AdminStats,
  AppNotification,
  AppSettings,
  Area,
  AdminArea,
  AdminCountry,
  SuggestedHelper,
  AvailabilitySlot,
  Country,
  CreditTransaction,
  HelpRequest,
  ID,
  NearbyHelper,
  ProfileInput,
  PublicProfile,
  RegisterInput,
  Review,
  Skill,
  SkillCategory,
  SkillInput,
  SkillSearchParams,
  User,
  UserStatus,
} from '@/types'
import { ApiError, get, http, post, setUnauthorizedHandler } from './http'
import { readStored, removeStored, writeStored } from './storage'

export { ApiError }

/** The API's single-resource and list responses are wrapped as `{ data: ... }`. */
type Wrapped<T> = { data: T }

/* ---------- session store (header balance, unread count, open reports) ---------- */

export interface SessionSnapshot {
  me: User
  unread: number
  /** True while a member is logged in. It is remembered in the browser so a refresh keeps them logged in. */
  signedIn: boolean
  /** Reports waiting for an admin decision (shown on the admin sidebar). */
  openReports: number
}

/** Stands in for "the member" while nobody is signed in, so pages never have to handle a missing user. */
const GUEST: User = {
  id: 0,
  name: '',
  email: '',
  role: 'member',
  status: 'active',
  bio: '',
  avatar_url: null,
  area: null,
  credit_balance: 0,
  trust_score: 0,
  completed_sessions: 0,
  rating_avg: null,
  rating_count: 0,
  badges: [],
  availability: [],
  created_at: '',
  suspended_reason: null,
}

const listeners = new Set<() => void>()
// The signed-in member is remembered in the browser so a refresh keeps them in; the API confirms it on start-up.
const storedSession = readStored<{ email: string; user?: User } | null>('session', null)
let realMe: User | null = storedSession?.user ?? null
let signedIn = storedSession !== null
let unreadCount = 0
let openReportsCount = 0
let snapshot: SessionSnapshot = { me: realMe ?? GUEST, unread: unreadCount, signedIn, openReports: openReportsCount }

function setSignedIn(value: boolean, user?: User) {
  signedIn = value
  if (value && user) {
    realMe = user
    writeStored('session', { email: user.email, user })
  } else if (!value) {
    realMe = null
    unreadCount = 0
    openReportsCount = 0
    removeStored('session')
  }
}

function emit() {
  snapshot = { me: { ...(realMe ?? GUEST) }, unread: unreadCount, signedIn, openReports: openReportsCount }
  listeners.forEach((l) => l())
}

function setUnread(list: AppNotification[]) {
  unreadCount = list.filter((n) => !n.read_at).length
  emit()
}

function setMember(user: User) {
  setSignedIn(true, user)
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

/** An API call that still honours the ?state=loading | empty | error review helper. */
async function live<T>(call: () => Promise<T>, empty?: T): Promise<T> {
  const forced = forcedState()
  if (forced === 'loading') return new Promise<T>(() => undefined)
  if (forced === 'error') throw new ApiError('We could not reach the server. Check your connection and try again.', 503)
  if (forced === 'empty' && empty !== undefined) return empty
  return call()
}

/** A picture is only sent when it is new (a data URL) or being removed (null). An existing picture's URL means "keep it". */
function pictureField(value: string | null | undefined): { set: true; value: string | null } | { set: false } {
  if (value === null) return { set: true, value: null }
  if (typeof value === 'string' && value.startsWith('data:')) return { set: true, value }
  return { set: false }
}

/** Re-reads the signed-in member (for example their credit balance changes when a session is confirmed). */
async function refreshMember(): Promise<void> {
  try {
    const { data: user } = await get<Wrapped<User>>('/auth/me')
    setMember(user)
    void api.getNotifications().catch(() => undefined)
    if (user.role === 'admin') void api.refreshOpenReports()
  } catch {
    /* The next page load will refresh it. */
  }
}

export const api = {
  /* ---------- auth ---------- */

  async login(email: string, password: string): Promise<User> {
    let user: User
    try {
      user = (await post<Wrapped<User>>('/auth/login', { email: email.trim(), password })).data
    } catch (err) {
      // The login form shows one message ("Email or password is incorrect"), not a per-field error.
      if (err instanceof ApiError && err.errors.email) throw new ApiError(err.errors.email, err.status)
      throw err
    }
    setMember(user)
    void api.getNotifications().catch(() => undefined) // fills the unread badge
    if (user.role === 'admin') void api.refreshOpenReports()
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
    // Only a 401 (handled globally) ends the session. A network error keeps the remembered member.
    await refreshMember()
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
    setMember(user)
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

  async getMySkills(): Promise<Skill[]> {
    return live(async () => (await get<Wrapped<Skill[]>>('/my/skills')).data, [])
  },

  async createSkill(input: SkillInput): Promise<Skill> {
    const picture = pictureField(input.image_url)
    const { data } = await post<Wrapped<Skill>>('/skills', {
      title: input.title,
      category_id: input.category_id,
      description: input.description,
      ...(picture.set ? { image_url: picture.value } : {}),
    })
    return data
  },

  async updateSkill(id: ID, input: SkillInput & { status?: Skill['status'] }): Promise<Skill> {
    const picture = pictureField(input.image_url)
    const { data } = await http<Wrapped<Skill>>('PUT', `/skills/${id}`, {
      body: {
        title: input.title,
        category_id: input.category_id,
        description: input.description,
        ...(input.status && input.status !== 'removed' ? { status: input.status } : {}),
        ...(picture.set ? { image_url: picture.value } : {}),
      },
    })
    return data
  },

  async deleteSkill(id: ID): Promise<void> {
    await http('DELETE', `/skills/${id}`)
  },

  /** A member reports a skill post or a review to the moderators. */
  async reportContent(kind: 'skill' | 'review', targetId: ID, reason: string): Promise<void> {
    await post('/reports', { kind, target_id: targetId, reason })
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

  async getMe(): Promise<{ user: User; reviews: Review[] }> {
    return live(async () => {
      const { data } = await get<Wrapped<{ user: User; reviews: Review[] }>>('/profile')
      return data
    })
  },

  /** Saves name, bio and area. `avatarUrl` is the picture to keep (its URL), a new one (a data URL) or null to remove it. */
  async updateProfile(input: ProfileInput, avatarUrl: string | null): Promise<User> {
    const picture = pictureField(avatarUrl)
    const { data } = await http<Wrapped<User>>('PUT', '/profile', {
      body: {
        name: input.name,
        bio: input.bio,
        country_code: input.country_code,
        area_name: input.area_name,
        ...(picture.set ? { avatar_url: picture.value } : {}),
      },
    })
    setMember(data)
    return data
  },

  async updateAvailability(slots: AvailabilitySlot[]): Promise<User> {
    const { data } = await http<Wrapped<User>>('PUT', '/profile/availability', { body: { slots } })
    setMember(data)
    return data
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

  async getAdminStats(): Promise<AdminStats> {
    return live(async () => {
      const { data } = await get<Wrapped<AdminStats>>('/admin/stats')
      openReportsCount = data.open_reports
      emit()
      return data
    })
  },

  /** Updates the red number on the admin sidebar. */
  async refreshOpenReports(): Promise<void> {
    try {
      openReportsCount = (await get<{ open: number }>('/admin/reports/count')).open
      emit()
    } catch {
      /* The badge is a convenience. */
    }
  },

  async getAdminMembers(q: string, signal?: AbortSignal): Promise<AdminMember[]> {
    return live(async () => (await get<Wrapped<AdminMember[]>>('/admin/members', { query: { q: q.trim() }, signal })).data, [])
  },

  async setMemberStatus(id: ID, status: UserStatus, reason: string | null): Promise<void> {
    await post(`/admin/members/${id}/status`, { status, reason })
  },

  async getAdminCategories(): Promise<SkillCategory[]> {
    return live(async () => (await get<Wrapped<SkillCategory[]>>('/admin/categories')).data, [])
  },

  async saveCategory(id: ID | null, name: string): Promise<SkillCategory> {
    const { data } = id
      ? await http<Wrapped<SkillCategory>>('PUT', `/admin/categories/${id}`, { body: { name } })
      : await post<Wrapped<SkillCategory>>('/admin/categories', { name })
    return data
  },

  async toggleCategory(id: ID): Promise<SkillCategory> {
    return (await post<Wrapped<SkillCategory>>(`/admin/categories/${id}/toggle`)).data
  },

  async getModeration(): Promise<AdminModeration> {
    return live(
      async () => {
        const { data } = await get<Wrapped<AdminModeration>>('/admin/moderation')
        openReportsCount = data.reported.length
        emit()
        return data
      },
      { reported: [], skills: [], reviews: [], audit: [] },
    )
  },

  async moderate(kind: 'skill' | 'review', id: ID, action: 'remove' | 'restore', reason: string): Promise<void> {
    await post(`/admin/moderation/${kind}/${id}/${action}`, { reason })
    await api.refreshOpenReports()
  },

  /** Keeps the content and closes the report. */
  async dismissReport(id: ID): Promise<void> {
    await post(`/admin/reports/${id}/dismiss`)
    await api.refreshOpenReports()
  },

  async getSettings(): Promise<AppSettings> {
    return live(async () => (await get<Wrapped<AppSettings>>('/admin/settings')).data)
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    return (await http<Wrapped<AppSettings>>('PUT', '/admin/settings', { body: settings })).data
  },

  async getAdminCountries(): Promise<AdminCountry[]> {
    return live(async () => (await get<Wrapped<AdminCountry[]>>('/admin/countries')).data, [])
  },

  async toggleCountry(id: ID): Promise<AdminCountry> {
    return (await post<Wrapped<AdminCountry>>(`/admin/countries/${id}/toggle`)).data
  },

  async getAdminAreas(countryCode: string, q: string, signal?: AbortSignal): Promise<AdminArea[]> {
    return live(
      async () => (await get<Wrapped<AdminArea[]>>('/admin/areas', { query: { country_code: countryCode, q: q.trim() }, signal })).data,
      [],
    )
  },

  async renameArea(id: ID, name: string): Promise<AdminArea> {
    return (await http<Wrapped<AdminArea>>('PUT', `/admin/areas/${id}`, { body: { name } })).data
  },

  async deleteArea(id: ID): Promise<void> {
    await http('DELETE', `/admin/areas/${id}`)
  },

  /** Helpers who could take on a request for this skill, best match first. */
  async getSuggestedHelpers(skillId: ID): Promise<SuggestedHelper[]> {
    return live(async () => (await get<Wrapped<SuggestedHelper[]>>(`/skills/${skillId}/helpers`)).data, [])
  },
}

/* ---------- keeping the bell fresh ---------- */

/** While someone is signed in and the tab is open, ask for new notifications (and open reports, for admins) every 15 seconds. */
function refreshBadges() {
  if (!signedIn || document.hidden) return
  void api.getNotifications().catch(() => undefined)
  if (realMe?.role === 'admin') void api.refreshOpenReports()
}

if (typeof window !== 'undefined') {
  window.setInterval(refreshBadges, 15_000)
  // Coming back to the tab refreshes straight away instead of waiting for the next tick.
  document.addEventListener('visibilitychange', refreshBadges)
}
