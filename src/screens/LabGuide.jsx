import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import MarkdownViewer from "../components/MarkdownViewer"
import { downloadBlob } from "../lib/download"
import { WORKFLOW } from "../workflow/states"
import { BookOpen, Clock, Layers, RefreshCw, CheckCircle2, Sparkles, FileText } from "lucide-react"

/** 
 * LabGuide step (3-stage flow):
 * A. Plan review (shows Lab Guide Plan, Approve & Regenerate buttons)
 * B. Generating (loader)
 * C. Generated content (tabs: Overview, Setup, Walkthrough, Verification)
 */
export default function LabGuide({
  course,
  section,
  onSelectSection,
  lab,
  guide,
  status,
  onApprove,
  onRegenerate,
  generating,
  busy,
  failed,
  error,
  canApprove,
  canRegenerate,
  onFinish,
}) {
  const isComplete = status === WORKFLOW.COMPLETE
  const baseSections = guide?.sections || []
  const hasGuide = baseSections.length > 0 && isComplete
  
  const handleDownloadGuide = () => {
    if (!baseSections.length) return
    const content = baseSections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n")
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
    downloadBlob(blob, `${course?.title || "course"}-lab-guide.md`)
  }
  
  const sections = baseSections
  const page = sections.find((item) => item.id === section) || sections[0]

  // STAGE B: Generating / Error
  if (generating) {
    return (
      <section className="guide">
        <StatusBanner 
          tone="busy" 
          title="Generating full lab guide…" 
          message="Building learner documentation, walkthrough steps, and rubrics. Estimated time: 10-15 seconds." 
        />
      </section>
    )
  }

  if (failed && !hasGuide) {
    return (
      <section className="guide">
        <StatusBanner 
          tone="error" 
          title="Guide generation failed" 
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
      </section>
    )
  }

  // STAGE C: Generated Content (Pure guide tabs)
  if (hasGuide) {
    return (
      <section className="guide">
        <div className="guide-workspace">
          <nav className="guide-nav" aria-label="Lab guide">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`guide-section${item.id === (page?.id || section) ? " is-active" : ""}`}
                onClick={() => onSelectSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          
          <article className="guide-page">
            {page ? (
              <header className="guide-page-header">
                {page.kicker ? <p className="guide-kicker">{page.kicker}</p> : null}
                <h2>{page.title}</h2>
                {page.lede ? <p className="lede">{page.lede}</p> : null}
              </header>
            ) : null}
            {page?.content ? (
              <div className="guide-page-content" style={{ marginTop: 24 }}>
                <MarkdownViewer content={page.content} />
              </div>
            ) : null}
            
            {onFinish ? (
              <div className="actions" style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                <Button variant="secondary" onClick={handleDownloadGuide}>
                  Download full guide
                </Button>
                <Button variant="accent" onClick={onFinish}>
                  Finish &amp; go to overview →
                </Button>
              </div>
            ) : null}
          </article>
        </div>
      </section>
    )
  }

  // STAGE A: Guide Plan Review
  const guidePlan = course?.guidePlan || course?.guide_plan || guide?.planObj || {}
  const planContent =
    guidePlan?.raw ||
    (typeof guidePlan === "string" ? guidePlan : "") ||
    guide?.plan ||
    lab?.raw ||
    ""

  const estimatedMinutes =
    guidePlan?.estimated_time ||
    guidePlan?.estimatedTime ||
    lab?.estimated_time ||
    course?.estimated_time ||
    null

  const sectionsList = guidePlan?.sections || guide?.sections || []
  const chapters =
    guidePlan?.chapters ||
    (sectionsList.length > 0
      ? sectionsList.map((s, idx) => ({
          title: `${idx + 1}. ${typeof s === "string" ? s : s.title || s.label || `Chapter ${idx + 1}`}`,
          desc: typeof s === "object" ? s.desc || s.lede || s.description : "",
        }))
      : [])

  return (
    <section className="lab guide-plan-review">
      <div className="lab-plan">
        <header className="lab-plan-header">
          <div>
            <h2>Review Lab Guide Plan</h2>
            <p className="lede">Review the proposed structure and sections before generating the full learner guide.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {estimatedMinutes ? (
              <span className="lab-summary-badge">
                <Clock size={13} /> {estimatedMinutes} min estimated
              </span>
            ) : null}
            {chapters.length > 0 ? (
              <span className="lab-summary-badge">
                <Layers size={13} /> {chapters.length} sections
              </span>
            ) : null}
            <span className="lab-summary-badge" style={{ background: "var(--amber)", color: "var(--amber-text)" }}>
              <Sparkles size={13} /> Plan Review
            </span>
          </div>
        </header>

        <div className="lab-preview-card">
          {planContent ? (
            <MarkdownViewer content={planContent} />
          ) : (
            <div className="brief-card">
              <h3>No guide plan generated yet</h3>
              <p className="hint">Click regenerate to build a new guide plan from your lab scenario.</p>
              {canRegenerate ? (
                <Button variant="accent" onClick={onRegenerate} busy={busy} style={{ marginTop: 12 }}>
                  <RefreshCw size={14} style={{ marginRight: 6 }} />
                  Generate Guide Plan
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <aside className="lab-settings">
        <div className="lab-summary">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={18} color="var(--navy)" />
            <h3 style={{ margin: 0 }}>Review summary</h3>
          </div>
          
          <p className="hint" style={{ margin: 0 }}>
            Approve this plan outline to generate the full step-by-step learner documentation.
          </p>

          {chapters.length > 0 ? (
            <div style={{ marginTop: 12, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", margin: "0 0 10px" }}>
                Planned Chapters ({chapters.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {chapters.map((ch, idx) => (
                  <div
                    key={ch.title || idx}
                    style={{
                      padding: "8px 10px",
                      background: "var(--surface-inset)",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{ch.title}</div>
                    {ch.desc ? <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: 2 }}>{ch.desc}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="actions" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {canApprove && planContent ? (
            <Button variant="accent" onClick={onApprove} busy={busy}>
              Approve &amp; Generate Guide →
            </Button>
          ) : null}
          {canRegenerate ? (
            <Button variant="secondary" onClick={onRegenerate} busy={busy}>
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              Regenerate Plan
            </Button>
          ) : null}
        </div>
      </aside>
    </section>
  )
}
