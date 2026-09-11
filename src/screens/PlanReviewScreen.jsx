import { useEffect, useState } from "react"
import ApprovalActions from "../components/ApprovalActions"
import StatusBanner from "../components/StatusBanner"

/** Split slide.body into bullet lines for review (supports •, -, *, or numbered). */
function bodyBullets(body) {
  if (Array.isArray(body)) {
    return body.map(String).map((line) => line.trim()).filter(Boolean)
  }
  const text = String(body || "").trim()
  if (!text) return []
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean)
  if (lines.length > 1) {
    return lines.map((line) => line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim()).filter(Boolean)
  }
  // Single paragraph — still show as one block item
  return [text]
}

/**
 * Plan review — renders live course.plan.slides from the API.
 * Approve / Regenerate unchanged.
 */
export default function PlanReviewScreen({
  course,
  busy = false,
  canApprove = false,
  canRegenerate = false,
  onApprove,
  onRegenerate,
  error,
}) {
  const slides = course?.plan?.slides || []
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selection when the course or plan changes (e.g. after regenerate).
  useEffect(() => {
    setSelectedIndex(0)
  }, [course?.id, course?.updatedAt, course?.plan?.summary, slides.length])

  const safeIndex = Math.min(selectedIndex, Math.max(0, slides.length - 1))
  const slide = slides[safeIndex] || slides[0]
  const bullets = bodyBullets(slide?.body)

  return (
    <section className="ppt">
      {error ? <StatusBanner tone="error" title="Update failed" message={error} /> : null}

      <div className="status-row">
        <div>
          <h2>{course?.title || "Course plan"}</h2>
          <p>{course?.plan?.summary || `${slides.length} slides`}</p>
        </div>
        <ApprovalActions
          onApprove={onApprove}
          onRegenerate={onRegenerate}
          busy={busy}
          canApprove={canApprove && slides.length > 0}
          canRegenerate={canRegenerate}
          approveLabel="Approve"
          regenerateLabel="Regenerate"
        />
      </div>

      {!slides.length ? (
        <div className="brief-card">
          <h3>No slides yet</h3>
          <p className="hint">Regenerate to try again.</p>
        </div>
      ) : (
        <div className="review">
          <aside className="outline" aria-label="Plan outline">
            {slides.map((item, index) => (
              <button
                key={item.id ?? index}
                type="button"
                className={`outline-item${index === safeIndex ? " is-active" : ""}`}
                onClick={() => setSelectedIndex(index)}
              >
                <span className="outline-num">{String(item.id || index + 1).padStart(2, "0")}</span>
                <span className="outline-title">{item.title || item.heading || `Slide ${index + 1}`}</span>
              </button>
            ))}
          </aside>

          <div className="preview-panel plan-preview">
            <p className="panel-label">{slide?.kicker || `SLIDE ${safeIndex + 1}`}</p>
            <h3 style={{ marginTop: 8 }}>{slide?.heading || slide?.title}</h3>
            {bullets.length ? (
              <ul className="plan-slide-bullets">
                {bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {slide?.notes ? <p className="hint" style={{ marginTop: 16 }}>{slide.notes}</p> : null}
          </div>
        </div>
      )}
    </section>
  )
}
