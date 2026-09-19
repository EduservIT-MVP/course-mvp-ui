import { useEffect, useState } from "react"
import { requestBlob } from "../api/client"

/** Load an authenticated API image path into a blob: URL for <img src>. */
export function useAuthImageUrl(path) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null

    async function load() {
      
      setUrl(null)
      setError(null)
      if (!path) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const { blob } = await requestBlob(path)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  return { url, loading, error }
}
