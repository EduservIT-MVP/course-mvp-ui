import { useCallback, useEffect, useState } from "react"
import { courseService } from "../api/courseService"
import { useCoursePolling } from "./useCoursePolling"
import { isGenerating } from "../workflow/states"

/**
 * Load one course and keep it fresh while the backend is generating.
 * Screen choice must use course.status via resolveWorkflowScreen — not local UI state.
 */
export function useCourse(courseId) {
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(Boolean(courseId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
      setCourse(null)
      setLoading(false)
      return null
    }
    const data = await courseService.get(courseId)
    setCourse(data)
    setError(null)
    return data
  }, [courseId])

  useEffect(() => {
    let cancelled = false
    if (!courseId) {
      setCourse(null)
      setLoading(false)
      return undefined
    }
    // Keep previous course visible while the new id loads (avoids flashing back to the brief).
    setLoading(true)
    refresh()
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh, courseId])

  const pollStatus = course?.status

  useCoursePolling(courseId, pollStatus, () =>
    refresh().catch((err) => {
      setError(err)
    }),
  )

  const run = useCallback(async (action) => {
    setBusy(true)
    setError(null)
    try {
      const data = await action()
      setCourse(data)
      return data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  return { course, setCourse, loading, busy, error, setError, refresh, run, generating: isGenerating(pollStatus) }
}

export function useCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    const data = await courseService.list()
    setCourses(data)
    setError(null)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false
    refresh()
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  return { courses, loading, error, refresh }
}
