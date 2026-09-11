import { useEffect, useMemo, useRef, useState } from "react"
import { requestBlob } from "../api/client"

/**
 * Auth-fetch slide PNGs with an in-memory blob URL cache.
 * Keeps the last visible image while the next slide loads (no blank flash).
 * Prefetches neighbors for snappy Prev/Next.
 */
export function useSlideImageCache(paths, currentIndex) {
  const cacheRef = useRef(new Map())
  const lastUrlRef = useRef(null)
  const [, bump] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const pathKey = useMemo(
    () => (Array.isArray(paths) ? paths.filter(Boolean).join("|") : ""),
    [paths],
  )
  const list = useMemo(() => (pathKey ? pathKey.split("|") : []), [pathKey])
  const currentPath = list[currentIndex] || null
  const cachedUrl = currentPath ? cacheRef.current.get(currentPath) || null : null

  useEffect(() => {
    // New deck — drop old blob URLs.
    const cache = cacheRef.current
    for (const url of cache.values()) URL.revokeObjectURL(url)
    cache.clear()
    lastUrlRef.current = null
    bump((n) => n + 1)
  }, [pathKey])

  useEffect(() => {
    let cancelled = false

    async function ensure(path) {
      if (!path) return null
      if (cacheRef.current.has(path)) return cacheRef.current.get(path)
      const { blob } = await requestBlob(path)
      if (cancelled) return null
      if (cacheRef.current.has(path)) return cacheRef.current.get(path)
      const url = URL.createObjectURL(blob)
      cacheRef.current.set(path, url)
      bump((n) => n + 1)
      return url
    }

    async function load() {
      setError(null)
      if (!currentPath) {
        setPending(false)
        return
      }
      const hit = cacheRef.current.has(currentPath)
      if (!hit) setPending(true)
      try {
        const url = await ensure(currentPath)
        if (cancelled) return
        if (url) lastUrlRef.current = url
        const neighbors = [list[currentIndex - 1], list[currentIndex + 1]].filter(Boolean)
        neighbors.forEach((path) => {
          ensure(path).catch(() => {})
        })
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setPending(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentPath, currentIndex, list])

  useEffect(() => {
    const cache = cacheRef.current
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url)
      cache.clear()
    }
  }, [])

  if (cachedUrl) lastUrlRef.current = cachedUrl
  const loading = Boolean(currentPath) && !cachedUrl && pending

  return {
    url: cachedUrl || (loading ? lastUrlRef.current : null),
    loading,
    error,
    hasImage: Boolean(cachedUrl),
  }
}
