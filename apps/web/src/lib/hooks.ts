import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error }

/**
 * Runs an async loader whenever `key` changes. The loader receives an AbortSignal so a
 * newer call cancels an older one and stale results never overwrite fresh ones.
 */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, key: string) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const controller = new AbortController()
    setState((prev) => (prev.status === 'success' && nonce > 0 ? prev : { status: 'loading' }))
    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) })
      })
    return () => controller.abort()
  }, [key, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const setData = useCallback((updater: (prev: T) => T) => {
    setState((prev) => (prev.status === 'success' ? { status: 'success', data: updater(prev.data) } : prev))
  }, [])

  return { ...state, reload, setData }
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Stagger delays that shrink as the list goes on; items past the sixth arrive with the last one. */
const STAGGER = [0, 40, 75, 105, 130, 150]
export function staggerDelay(index: number): string {
  return `${STAGGER[Math.min(index, STAGGER.length - 1)]}ms`
}

/** Follows a CSS media query, for layout that cannot be done with classes alone. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}
