import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import MarkdownViewer from "../components/MarkdownViewer"
import { WORKFLOW } from "../workflow/states"
import { Download, FileCode, Clock, Layers, Sparkles, RefreshCw, Terminal, CheckCircle2 } from "lucide-react"

/**
 * LAB_REVIEW / LAB_APPROVED — full lab plan & generated artifacts.
 */
export default function LabGeneration({
  course,
  lab,
  status,
  onApproveLab,
  onStartGuide,
  onRegenerate,
  onDownloadArtifact,
  busy,
  generating,
  failed,
  error,
  canApproveLab,
  canStartGuide,
  canRegenerate,
}) {
  const plan = lab && typeof lab === "object" ? lab : {}
  const rawContent = plan.raw || plan.readme || plan.useCase || plan.description || ""
  const environment = plan.environment || course?.environment || ""
  const totalMinutes = plan.estimated_time || plan.estimatedTime || course?.estimated_time || null
  const isApproved = status === WORKFLOW.LAB_APPROVED
  const labArtifacts = (course?.artifacts || []).filter(
    (a) =>
      String(a.type || "").toLowerCase().includes("lab") ||
      String(a.sourceAgent || "").toLowerCase().includes("lab")
  )

  if (generating) {
    return (
      <section className="lab">
        <StatusBanner
          tone="busy"
          title="Generating lab environment…"
          message="Building hands-on code files, starter templates, and verification test scripts. Estimated time: 10-15 seconds."
        />
      </section>
    )
  }

  return (
    <section className="lab lab-review-layout">
      <div className="lab-plan">
        <header className="lab-plan-header">
          <div>
            <h2>{isApproved ? "Lab Environment Ready" : "Review Lab Plan"}</h2>
            <p className="lede">
              {isApproved
                ? "The hands-on coding scenario and starter artifacts have been generated."
                : "Review the lab scenario, tasks, and environment specification before building code."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {totalMinutes ? (
              <span className="lab-summary-badge">
                <Clock size={13} /> {totalMinutes} min estimated
              </span>
            ) : null}
            {environment ? (
              <span className="lab-summary-badge">
                <Terminal size={13} /> {environment}
              </span>
            ) : null}
            <span
              className="lab-summary-badge"
              style={
                isApproved
                  ? { background: "var(--green)", color: "var(--green-text)" }
                  : { background: "var(--amber)", color: "var(--amber-text)" }
              }
            >
              {isApproved ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
              {isApproved ? "Approved & Ready" : "Plan Review"}
            </span>
          </div>
        </header>


        {failed ? (
          <StatusBanner
            tone="error"
            title="Lab generation failed"
            message={error}
            action={
              canRegenerate ? (
                <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
                  <RefreshCw size={14} style={{ marginRight: 6 }} />
                  Retry
                </Button>
              ) : null
            }
          />
        ) : null}

        <div className="lab-preview-card">
          {rawContent ? (
            <MarkdownViewer content={rawContent} />
          ) : (
            <div className="brief-card">
              <h3>No lab plan available yet</h3>
              <p className="hint">Click regenerate to build a new hands-on lab specification.</p>
              {canRegenerate ? (
                <Button variant="accent" onClick={onRegenerate} busy={busy} style={{ marginTop: 12 }}>
                  <RefreshCw size={14} style={{ marginRight: 6 }} />
                  Generate Lab Plan
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <aside className="lab-settings">
        <div className="lab-summary">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Terminal size={18} color="var(--navy)" />
            <h3 style={{ margin: 0 }}>Review summary</h3>
          </div>

          <p className="hint" style={{ margin: 0 }}>
            {isApproved
              ? "Lab is approved. You can download the generated files or proceed to generate the learner guide."
              : "Approve to confirm this lab specification, or regenerate for a new plan from the agent."}
          </p>

          {labArtifacts.length > 0 ? (
            <div style={{ marginTop: 8, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", margin: "0 0 10px" }}>
                Generated Artifacts ({labArtifacts.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {labArtifacts.map((art) => (
                  <div
                    key={art.id || art.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      background: "var(--surface-inset)",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "12px",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", minWidth: 0 }}>
                      <FileCode size={15} color="var(--navy)" style={{ flexShrink: 0 }} />
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontWeight: 550 }}>
                        {art.name || art.label}
                      </span>
                    </div>
                    {onDownloadArtifact ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDownloadArtifact(art)}
                        disabled={busy}
                        title={`Download ${art.name}`}
                        style={{ padding: "4px 8px", fontSize: "11px", flexShrink: 0 }}
                      >
                        <Download size={12} style={{ marginRight: 4 }} />
                        Download
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="actions">
          {isApproved ? (
            canStartGuide ? (
              <Button variant="accent" onClick={onStartGuide} disabled={busy}>
                Generate lab guide →
              </Button>
            ) : null
          ) : canApproveLab && rawContent ? (
            <Button variant="accent" onClick={onApproveLab} disabled={busy}>
              Approve Lab
            </Button>
          ) : null}

          {canRegenerate ? (
            <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              Regenerate Lab
            </Button>
          ) : null}
        </div>
      </aside>
    </section>
  )
}

