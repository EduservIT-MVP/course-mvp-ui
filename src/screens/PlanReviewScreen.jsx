import React from "react"
import Button from "../components/Button"
import ApprovalActions from "../components/ApprovalActions"
import StatusBanner from "../components/StatusBanner"
import MarkdownViewer from "../components/MarkdownViewer"
import { Clock, Layers, Sparkles, RefreshCw } from "lucide-react"

/**
 * Plan review — renders the raw markdown plan from the agent.
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
  const planObj = course?.plan || course?.pptPlan
  const slideCount = planObj?.slides?.length || (planObj?.sections ? Number(planObj.sections) : null)
  const duration = planObj?.duration || course?.duration || null
  const planContent =
    planObj?.raw ||
    (planObj?.slides?.length
      ? planObj.slides
          .map(
            (s) =>
              `### ${s.title || `Slide ${s.id}`}\n\n**${s.heading || ""}**\n\n${s.body || ""}\n\n*Presenter Notes: ${s.notes || "None"}*`
          )
          .join("\n\n---\n\n")
      : "")

  return (
    <section className="ppt">
      {error ? <StatusBanner tone="error" title="Update failed" message={error} /> : null}

      <div className="status-row" style={{ alignItems: "flex-start", gap: 16 }}>
        <div>
          <h2>Review Presentation Plan</h2>
          <p className="lede">{course?.title ? `Slide deck outline and presenter structure for "${course.title}".` : "Review slide deck outline and topics before generating slides."}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {slideCount ? (
              <span className="lab-summary-badge">
                <Layers size={13} /> {slideCount} slides planned
              </span>
            ) : null}
            {duration ? (
              <span className="lab-summary-badge">
                <Clock size={13} /> {duration}
              </span>
            ) : null}
            <span className="lab-summary-badge" style={{ background: "var(--amber)", color: "var(--amber-text)" }}>
              <Sparkles size={13} /> AI Slide Outline
            </span>
          </div>
        </div>

        <ApprovalActions
          onApprove={onApprove}
          onRegenerate={onRegenerate}
          busy={busy}
          canApprove={canApprove && !!planContent}
          canRegenerate={canRegenerate}
          approveLabel="Approve & Generate Slides →"
          regenerateLabel="Regenerate Plan"
        />
      </div>

      {!planContent ? (
        <div className="brief-card">
          <h3>No plan generated yet</h3>
          <p className="hint">Click regenerate to build a new presentation plan from your course brief.</p>
          {canRegenerate ? (
            <Button variant="accent" onClick={onRegenerate} busy={busy} style={{ marginTop: 12 }}>
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              Generate Presentation Plan
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="review">
          <div className="lab-preview-card" style={{ overflowY: "auto", width: "100%", maxHeight: "calc(100vh - 240px)" }}>
            <MarkdownViewer content={planContent} />
          </div>
        </div>
      )}
    </section>
  )
}


