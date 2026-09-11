import { useEffect, useRef, useState } from "react"
import { PptxRenderer } from "pptx-browser"

const SLIDE_ASPECT = 16 / 9

/** Render one PPTX slide fitted inside the preview frame (no scroll). */
export default function PptxSlideCanvas({ blob, index, onError }) {
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = frameRef.current
    if (!el) return undefined

    const measure = () => {
      const w = Math.floor(el.clientWidth || 0)
      const h = Math.floor(el.clientHeight || 0)
      if (w > 0 && h > 0) setBox({ w, h })
    }

    measure()
    if (typeof ResizeObserver === "undefined") return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!blob) return undefined
    let cancelled = false
    const renderer = new PptxRenderer()
    rendererRef.current = renderer
    setReady(false)

    ;(async () => {
      try {
        await renderer.load(blob)
        if (cancelled) return
        setReady(true)
      } catch (err) {
        if (!cancelled) onError?.(err)
      }
    })()

    return () => {
      cancelled = true
      renderer.destroy()
      rendererRef.current = null
    }
  }, [blob, onError])

  useEffect(() => {
    const renderer = rendererRef.current
    const canvas = canvasRef.current
    if (!ready || !renderer || !canvas || box.w < 40 || box.h < 40) return undefined
    const slideIndex = Math.min(index, Math.max(0, renderer.slideCount - 1))

    // Fit 16:9 inside the frame so the preview never needs to scroll.
    let width = box.w
    let height = width / SLIDE_ASPECT
    if (height > box.h) {
      height = box.h
      width = height * SLIDE_ASPECT
    }
    width = Math.max(240, Math.floor(width))

    let cancelled = false
    setRendering(true)

    ;(async () => {
      try {
        await renderer.renderSlide(slideIndex, canvas, width)
      } catch (err) {
        if (!cancelled) onError?.(err)
      } finally {
        if (!cancelled) setRendering(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, index, box.w, box.h, onError])

  return (
    <article ref={frameRef} className={`pptx-frame${rendering ? " is-rendering" : ""}`}>
      <canvas ref={canvasRef} aria-label={`Slide ${index + 1} preview`} />
    </article>
  )
}
