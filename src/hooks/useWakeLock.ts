import { useEffect, useRef } from 'react'
import { useReaderState } from '../state/useReaderState'

/**
 * Keeps the screen from auto-locking (inactivity timeout) while actively
 * reading. Does NOT override a user manually pressing the lock button or
 * switching/minimizing the app — that's governed by the browser/OS's own
 * backgrounding policy, not something a web page can override.
 *
 * The Wake Lock API auto-releases when the tab is hidden and does not
 * reacquire itself on return — this hook reacquires on visibilitychange if
 * still reading. Feature-detected; silently no-ops where unsupported
 * (Safari desktop lacks it in some versions; iOS Safari added it in 16.4).
 */
export function useWakeLock(): void {
  const isReading = useReaderState((s) => s.isReading)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!('wakeLock' in navigator) || !isReading) return

    let cancelled = false

    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        wakeLockRef.current = sentinel
      } catch {
        // Denied or unsupported at runtime — not critical, fail silently.
      }
    }
    void acquire()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        void acquire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [isReading])
}
