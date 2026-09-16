import { useMemo, useState } from "react"
import Button from "../components/Button"
import PptViewer from "../components/PptViewer"
import StatusBanner from "../components/StatusBanner"

/**
 * PPT_READY — vector PowerPoint presentation rendered directly in-browser via PptViewer.
 * Outline acts as an interactive slide navigator.
 * Download serves the real .pptx file.
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
  const [detectedSlideCount, setDetectedSlideCount] = useState(0)
  const planSlides = course?.plan?.slides

  const slides = useMemo(() => {
    const plans = planSlides || []
    const count = Math.max(plans.length, detectedSlideCount)
    if (!count) return []
    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      title: plans[index]?.title || plans[index]?.heading || `Slide ${index + 1}`,
    }))
  }, [planSlides, detectedSlideCount])

  const safeIndex = Math.min(Math.max(0, slideIndex || 0), Math.max(0, slides.length - 1))
  const ready = (Boolean(slides.length) || Boolean(ppt)) && !generating

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
            <Button variant="secondary" onClick={onDownloadPpt} busy={downloading} disabled={busy || downloading || !ppt}>
              {downloading ? "Downloading…" : "Download"}
            </Button>
          ) : null}
          {canStartLab ? (
            <Button variant="accent" onClick={onStartLab} busy={busy} disabled={busy || !ppt}>
              {busy ? "Starting…" : "Generate lab →"}
            </Button>
          ) : null}
        </div>
      </div>

      {!ready ? (
        <div className="brief-card">
          <h3>No presentation available yet</h3>
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
            <article className="pptx-frame">
              <PptViewer
                courseId={course?.id}
                ppt={ppt}
                slideIndex={safeIndex}
                onTotalSlides={setDetectedSlideCount}
              />
            </article>

            <div className="pptx-nav">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSelectSlide(Math.max(0, safeIndex - 1))}
                disabled={safeIndex <= 0}
              >
                Prev
              </Button>
              <p>
                {safeIndex + 1} / {slides.length || 1}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSelectSlide(Math.min((slides.length || 1) - 1, safeIndex + 1))}
                disabled={safeIndex >= (slides.length || 1) - 1}
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

