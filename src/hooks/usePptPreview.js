import { useEffect, useState } from "react"
import { fileService, findPptArtifact } from "../api/fileService"
import { parsePptx, revokeSlideImages } from "../lib/parsePptx"

export function usePptPreview(course) {
  const [slides, setSlides] = useState([])
  const [blob, setBlob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const ppt = findPptArtifact(course)
  const pptKey = `${course?.id || ""}:${ppt?.id || ""}:${course?.updatedAt || ""}`

  useEffect(() => {
    let cancelled = false
    let loaded = []

    async function load() {
      revokeSlideImages(loaded)
      setBlob(null)
      if (!course?.id || !ppt) {
        setSlides(course?.plan?.slides || [])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const file = await fileService.download(course.id, ppt)
        const parsed = await parsePptx(file.blob)
        if (cancelled) {
          revokeSlideImages(parsed)
          return
        }
        loaded = parsed
        setBlob(file.blob)
        if (parsed.length) {
          const fallback = course.plan?.slides || []
          setSlides(
            parsed.map((slide, index) => ({
              ...fallback[index],
              ...slide,
              notes: slide.notes || fallback[index]?.notes || "",
            })),
          )
        } else {
          setSlides(course.plan?.slides || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setSlides(course.plan?.slides || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      revokeSlideImages(loaded)
    }
  }, [pptKey])

  return { slides, blob, loading, error, ppt }
}
