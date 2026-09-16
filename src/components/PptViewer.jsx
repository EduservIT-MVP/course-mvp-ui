import { useCallback, useEffect, useRef, useState } from "react"
import { loadPresentation, renderSlideToElement } from "pptx-viewer"
import { fileService } from "../api/fileService"
import Button from "./Button"

/**
 * In-browser vector PowerPoint viewer using pptx-viewer.
 * Renders slide presentations directly to vector SVG within the DOM.
 */
export default function PptViewer({
  courseId,
  ppt,
  slideIndex = 0,
  onTotalSlides,
  onError,
}) {
  const stageRef = useRef(null)
  const presentationRef = useRef(null)
  const loadedKeyRef = useRef(null)
  const resizeObserverRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState(null)
  const [slideCount, setSlideCount] = useState(0)

  // Load and parse the presentation blob
  const loadPpt = useCallback(async () => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      if (presentationRef.current) {
        presentationRef.current.cleanup?.()
        presentationRef.current = null
      }

      const blob = await fileService.fetchPptBlob(courseId)
      if (!blob || blob.size < 64) {
        throw new Error("Presentation file is empty or unavailable.")
      }

      // Verify ZIP magic bytes (PK..)
      const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
      if (head[0] !== 0x50 || head[1] !== 0x4b) {
        throw new Error("Downloaded artifact is not a valid presentation.")
      }

      const arrayBuffer = await blob.arrayBuffer()
      const pres = await loadPresentation(arrayBuffer)

      // Clear slideMasters and slideLayouts to prevent pptx-viewer relationship
      // bug from injecting slides as master-shapes underneath every slide.
      if (pres.slideMasters) pres.slideMasters.clear()
      if (pres.slideLayouts) pres.slideLayouts.clear()

      presentationRef.current = pres

      const count = pres.slides?.length || 0
      setSlideCount(count)
      onTotalSlides?.(count)
      loadedKeyRef.current = `${courseId}_${ppt?.id || ppt?.name || "latest"}`
    } catch (err) {
      const msg = err?.message || "Failed to load presentation."
      setError(msg)
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }, [courseId, ppt, onTotalSlides, onError])

  // Trigger load when course or PPT artifact changes
  useEffect(() => {
    const currentKey = `${courseId}_${ppt?.id || ppt?.name || "latest"}`
    if (loadedKeyRef.current !== currentKey) {
      loadPpt()
    }
  }, [courseId, ppt, loadPpt])

  // Render the requested slide to the container element
  const renderCurrentSlide = useCallback(() => {
    const pres = presentationRef.current
    const stage = stageRef.current
    if (!pres || !stage || !pres.slides?.length) return

    const safeIndex = Math.max(0, Math.min(slideIndex, pres.slides.length - 1))
    setRendering(true)

    try {
      // Calculate responsive dimensions based on container and aspect ratio
      const rect = stage.getBoundingClientRect()
      const slideSize = pres.slideSize || { width: 1280, height: 720 }
      const ratio = slideSize.width / slideSize.height

      const padX = 32
      const padY = 32
      const availW = Math.max(100, rect.width - padX)
      const availH = Math.max(100, rect.height - padY)

      let w = availW
      let h = w / ratio
      if (h > availH) {
        h = availH
        w = h * ratio
      }

      // Render slide cleanly to container
      renderSlideToElement(pres, safeIndex, stage, { width: Math.round(w), height: Math.round(h) })

      // Remove any lingering master/layout shapes if injected
      const masterLayer = stage.querySelector('g[data-layer="master-shapes"]')
      if (masterLayer) masterLayer.remove()
      const layoutLayer = stage.querySelector('g[data-layer="layout-shapes"]')
      if (layoutLayer) layoutLayer.remove()
    } catch (renderErr) {
      console.error("Failed to render slide:", renderErr)
      setError("Could not render this slide.")
    } finally {
      setRendering(false)
    }
  }, [slideIndex])

  // Re-render when slideIndex or loading state updates
  useEffect(() => {
    if (!loading && presentationRef.current) {
      renderCurrentSlide()
    }
  }, [loading, slideIndex, renderCurrentSlide])

  // Responsive re-render on container resize
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === "undefined") return

    let timeoutId = null
    const ro = new ResizeObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (presentationRef.current && !loading) {
          renderCurrentSlide()
        }
      }, 150)
    })

    ro.observe(stage)
    resizeObserverRef.current = ro

    return () => {
      clearTimeout(timeoutId)
      ro.disconnect()
    }
  }, [loading, renderCurrentSlide])

  // Cleanup presentation resources on unmount
  useEffect(() => {
    return () => {
      if (presentationRef.current) {
        presentationRef.current.cleanup?.()
        presentationRef.current = null
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="pptx-viewer-root">
      <div
        className="pptx-viewer-stage"
        ref={stageRef}
        role="region"
        aria-label={`Slide ${slideIndex + 1} of ${slideCount || 1}`}
      />

      {loading ? (
        <div className="pptx-frame-loading" role="status" aria-live="polite">
          <span className="pptx-spinner" aria-hidden="true" />
          <span>Loading presentation…</span>
        </div>
      ) : null}

      {rendering && !loading ? (
        <div className="pptx-frame-rendering-overlay" role="status" aria-live="polite">
          <span className="pptx-spinner pptx-spinner-sm" aria-hidden="true" />
          <span>Rendering…</span>
        </div>
      ) : null}

      {error && !loading ? (
        <div className="pptx-frame-empty">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={loadPpt}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  )
}
