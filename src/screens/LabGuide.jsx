import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import MarkdownViewer from "../components/MarkdownViewer"

/** 
 * LabGuide step (3-stage flow):
 * A. Plan review (shows Lab Plan/README, Approve & Regenerate buttons)
 * B. Generating (loader)
 * C. Generated content (tabs: Overview, Setup Walkthrough, Verification)
 */
export default function LabGuide({
  section,
  onSelectSection,
  lab,
  guide,
  onApprove,
  onRegenerate,
  generating,
  busy,
  failed,
  error,
  canApprove,
  canRegenerate,
}) {
  const sections = guide?.sections || []
  const hasGuide = sections.length > 0
  const page = sections.find((item) => item.id === section) || sections[0]

  // STAGE B: Generating / Error
  if (generating) {
    return (
      <section className="guide">
        <StatusBanner tone="busy" title="Generating lab guide…" message="This can take a minute." />
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
                Retry
              </Button>
            ) : null
          }
        />
      </section>
    )
  }

  // STAGE C: Generated Content (Tabs)
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
          </article>
        </div>
      </section>
    )
  }

  // STAGE A: Plan Review
  const planContent = guide?.readme || guide?.plan

  return (
    <section className="guide">
      <header className="lab-plan-header" style={{ marginBottom: 24 }}>
        <h2>Review Lab Plan</h2>
        <p className="lede">Review the proposed lab plan before generating the final guide.</p>
      </header>

      <div className="plan-review" style={{ marginBottom: 24 }}>
        {planContent ? (
          <MarkdownViewer content={planContent} />
        ) : (
          <div className="brief-card">
            <p className="hint">No lab plan available to review.</p>
          </div>
        )}
      </div>

      <div className="actions" style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
        {canApprove && planContent ? (
          <Button variant="accent" onClick={onApprove} disabled={busy}>
            Approve &amp; Generate Guide
          </Button>
        ) : null}
        {canRegenerate ? (
          <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
            Regenerate Plan
          </Button>
        ) : null}
      </div>
    </section>
  )
}
