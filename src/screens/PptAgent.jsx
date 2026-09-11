import { useMemo } from "react"
import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import { useSlideImageCache } from "../hooks/useSlideImageCache"

/**
 * PPT_READY — preview pre-rendered slide PNGs; outline is a navigator only.
 * Download still serves the real .pptx. Stable across agent swaps as long as
 * course.slideImages[] + ppt artifact are populated before PPT_READY.
 */
export default function PptAgent({
  course,
  slideIndex,
  onSelectSlide,
  onRegenerate,
  onDownloadPpt,
  onStartLab,
  busy,
  downloading,
  generating,
  failed,
  error,
  canRegenerate,
  canDownloadPpt,
  canStartLab,
  ppt,
}) {
  const planSlides = course?.plan?.slides
  const slideImages = course?.slideImages

  const slides = useMemo(() => {
    const plans = planSlides || []
    const images = slideImages || []
    if (images.length) {
      return images.map((img, index) => ({
        id: index + 1,
        title: plans[index]?.title || plans[index]?.heading || `Slide ${index + 1}`,
        url: img.url,
      }))
    }
    return plans.map((item, index) => ({
      id: item.id || index + 1,
      title: item.title || item.heading || `Slide ${index + 1}`,
      url: null,
    }))
  }, [planSlides, slideImages])

  const imagePaths = useMemo(() => slides.map((s) => s.url).filter(Boolean), [slides])
  const safeIndex = Math.min(Math.max(0, slideIndex || 0), Math.max(0, slides.length - 1))
  const slide = slides[safeIndex]
  const ready = Boolean(slides.length) && !generating
  const image = useSlideImageCache(imagePaths, safeIndex)
  const showPlaceholder = ready && !image.hasImage && !image.loading

  return (
    <section className="ppt">
      {failed ? (
        <StatusBanner
          tone="error"
          title="PPT generation failed"
          message={error}
          action={
            canRegenerate ? (
              <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
                Retry
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="status-row">
        <div>
          <h2>{course?.title || "Presentation"}</h2>
          <p>{ppt?.name || `${slides.length || 0} slides`}</p>
        </div>
        <div className="actions">
          {canDownloadPpt ? (
            <Button variant="secondary" onClick={onDownloadPpt} disabled={busy || downloading || !ppt}>
              {downloading ? "Downloading…" : "Download"}
            </Button>
          ) : null}
          {canStartLab ? (
            <Button onClick={onStartLab} disabled={busy || !ppt || !(slideImages?.length)}>
              {busy ? "Starting…" : "Generate lab →"}
            </Button>
          ) : null}
        </div>
      </div>

      {!ready ? (
        <div className="brief-card">
          <h3>No slides yet</h3>
        </div>
      ) : (
        <div className="review">
          <aside className="outline" aria-label="Slide outline">
            {slides.map((item, index) => (
              <button
                key={`slide-${index}`}
                type="button"
                className={`outline-item${index === safeIndex ? " is-active" : ""}`}
                onClick={() => onSelectSlide(index)}
              >
                <span className="outline-num">{String(index + 1).padStart(2, "0")}</span>
                <span className="outline-title">{item.title}</span>
              </button>
            ))}
          </aside>

          <div className="preview-panel">
            <article className={`pptx-frame${image.loading ? " is-rendering" : ""}`}>
              {image.url ? (
                <img
                  className="pptx-slide-image"
                  src={image.url}
                  alt={slide?.title || `Slide ${safeIndex + 1}`}
                  draggable={false}
                />
              ) : null}
              {image.loading ? (
                <div className="pptx-frame-loading" role="status" aria-live="polite">
                  <span className="pptx-spinner" aria-hidden="true" />
                  <span>Loading slide…</span>
                </div>
              ) : null}
              {showPlaceholder ? (
                <div className="pptx-frame-empty">
                  <p>{image.error ? "Could not load this slide." : "Slide preview unavailable."}</p>
                  {canRegenerate ? (
                    <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
                      Regenerate
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>

            <div className="pptx-nav">
              <Button
                variant="secondary"
                onClick={() => onSelectSlide(Math.max(0, safeIndex - 1))}
                disabled={safeIndex <= 0 || image.loading}
              >
                Prev
              </Button>
              <p>
                {safeIndex + 1} / {slides.length}
              </p>
              <Button
                variant="secondary"
                onClick={() => onSelectSlide(Math.min(slides.length - 1, safeIndex + 1))}
                disabled={safeIndex >= slides.length - 1 || image.loading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
