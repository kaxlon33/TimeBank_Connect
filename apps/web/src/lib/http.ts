/**
 * Small fetch wrapper for the Laravel API (Sanctum SPA cookie auth).
 *
 * - Cookies are sent with every request (`credentials: 'include'`).
 * - Before the first change (POST/PUT/DELETE) it asks for a CSRF cookie and echoes it back
 *   in the `X-XSRF-TOKEN` header. A 419 (expired token) is retried once with a fresh one.
 * - Laravel's `{ message, errors: { field: [..] } }` becomes an `ApiError` with one message per field.
 *
 * In development Vite proxies `/api` and `/sanctum` to Laravel, so the browser sees one origin.
 * For a separate API host set VITE_API_URL (and add the site to SANCTUM_STATEFUL_DOMAINS).
 */
export class ApiError extends Error {
  status: number
  errors: Record<string, string>
  constructor(message: string, status = 422, errors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface Options {
  query?: Record<string, string | number | null | undefined>
  body?: unknown
  signal?: AbortSignal
}

let onUnauthorized: (() => void) | null = null
/** Called when the API says the session is gone (401), so the app can send the member to the login page. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

let csrfReady = false

async function ensureCsrf(force = false) {
  if (csrfReady && !force) return
  await fetch(`${BASE}/sanctum/csrf-cookie`, { credentials: 'include', headers: { Accept: 'application/json' } })
  csrfReady = true
}

function xsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function url(path: string, query?: Options['query']) {
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  })
  const qs = params.toString()
  return `${BASE}/api${path}${qs ? `?${qs}` : ''}`
}

async function send(method: Method, path: string, { query, body, signal }: Options, retry: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
  if (method !== 'GET') {
    await ensureCsrf()
    const token = xsrfToken()
    if (token) headers['X-XSRF-TOKEN'] = token
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(url(path, query), {
    method,
    headers,
    credentials: 'include',
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 419 && retry) {
    await ensureCsrf(true)
    return send(method, path, { query, body, signal }, false)
  }
  return res
}

export async function http<T>(method: Method, path: string, options: Options = {}): Promise<T> {
  let res: Response
  try {
    res = await send(method, path, options, true)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('We could not reach the server. Check your connection and try again.', 503)
  }

  if (res.status === 204) return undefined as T

  const payload = (await res.json().catch(() => null)) as {
    message?: string
    errors?: Record<string, string[] | string>
  } | null

  if (res.ok) return payload as T

  const errors: Record<string, string> = {}
  Object.entries(payload?.errors ?? {}).forEach(([field, messages]) => {
    errors[field] = Array.isArray(messages) ? (messages[0] ?? '') : messages
  })

  // A wrong password is a 422 and a gone session is a 401; only the latter ends the session.
  if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized?.()

  const fallback =
    res.status === 404
      ? 'We could not find that.'
      : res.status === 429
        ? 'Too many tries. Please wait a moment.'
        : res.status >= 500
          ? 'Something went wrong on our side. Please try again.'
          : 'Something went wrong.'
  const message = payload?.message && res.status !== 500 ? payload.message : fallback
  throw new ApiError(res.status === 422 && Object.keys(errors).length ? 'Please fix the highlighted fields.' : message, res.status, errors)
}

export const get = <T>(path: string, options?: Options) => http<T>('GET', path, options)
export const post = <T>(path: string, body?: unknown, options?: Options) => http<T>('POST', path, { ...options, body })
