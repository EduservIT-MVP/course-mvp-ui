import { useEffect, useRef } from "react"
import { isGenerating } from "../workflow/states"

const DEFAULT_INTERVAL_MS = 2000

/**
 * Poll while a course is in a *_GENERATING status.
 * - Starts immediately when enabled, then on interval.
 * - Stops when status leaves generating (or courseId is cleared).
 * - Clears the interval on unmount.
 *
 * Pass the latest known status so callers stay in control of when polling runs;
 * typically: useCoursePolling(courseId, course?.status, refresh).
 */
export function useCoursePolling(courseId, status, onPoll, intervalMs = DEFAULT_INTERVAL_MS) {
  const onPollRef = useRef(onPoll)

  useEffect(() => {
    onPollRef.current = onPoll
  }, [onPoll])

  const shouldPoll = Boolean(courseId) && isGenerating(status)

  useEffect(() => {
    if (!shouldPoll) return undefined

    let cancelled = false

    const tick = () => {
      if (cancelled) return
      Promise.resolve(onPollRef.current?.()).catch(() => {
        // Caller owns error state; do not stop polling on a transient failure.
      })
    }

    tick()
    const id = window.setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [courseId, shouldPoll, intervalMs])
}
