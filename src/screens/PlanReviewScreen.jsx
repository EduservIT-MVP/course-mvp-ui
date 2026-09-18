import React from "react"
import ApprovalActions from "../components/ApprovalActions"
import StatusBanner from "../components/StatusBanner"
import MarkdownViewer from "../components/MarkdownViewer"

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
  const planContent = course?.plan?.raw || ""

  return (
    <section className="ppt">
      {error ? <StatusBanner tone="error" title="Update failed" message={error} /> : null}

      <div className="status-row">
        <div>
          <h2>{course?.title || "Course plan"}</h2>
          <p>{course?.plan?.summary || "Plan available"}</p>
        </div>
        <ApprovalActions
          onApprove={onApprove}
          onRegenerate={onRegenerate}
          busy={busy}
          canApprove={canApprove && !!planContent}
          canRegenerate={canRegenerate}
          approveLabel="Approve"
          regenerateLabel="Regenerate"
        />
      </div>

      {!planContent ? (
        <div className="brief-card">
          <h3>No plan yet</h3>
          <p className="hint">Regenerate to try again.</p>
        </div>
      ) : (
        <div className="review">
          <div className="preview-panel plan-preview" style={{ padding: "24px", maxWidth: "800px", margin: "0 auto", width: "100%", maxHeight: "none" }}>
            <MarkdownViewer content={planContent} />
          </div>
        </div>
      )}
    </section>
  )
}

