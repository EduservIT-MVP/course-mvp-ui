import { useCallback, useEffect, useState } from "react"
import { courseService } from "../api/courseService"
import { isGenerating } from "../workflow/states"
import { usePolling } from "./usePolling"

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
    setLoading(Boolean(courseId))
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

  usePolling(
    () => {
      refresh().catch((err) => setError(err))
    },
    courseId && isGenerating(course?.status) ? 2000 : null,
  )

  const run = useCallback(
    async (action) => {
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
    },
    [],
  )

  return { course, setCourse, loading, busy, error, setError, refresh, run }
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
