import checkCircle from "../assets/check-circle.svg"
import Button from "../components/Button"
import Icon from "../components/Icon"
import StatusBanner from "../components/StatusBanner"

/** Always render criteria as a list of strings (never iterate a raw string). */
function normalizeCriteria(raw) {
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => {
        if (typeof item === "string") return [item]
        if (item && typeof item === "object") return [item.text || item.label || item.title || ""]
        return [String(item ?? "")]
      })
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/\n|;/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function parseMinutes(time) {
  if (!time) return 0
  const match = String(time).match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

/**
 * LAB_REVIEW — full lab plan from course.lab (API), then Approve / Regenerate.
 * Binds only to the generated lab object — no local draft / leftover fixtures.
 */
export default function LabGeneration({
  lab,
  onGenerate,
  onRegenerate,
  busy,
  generating,
  failed,
  error,
  canGenerate,
  canRegenerate,
}) {
  const plan = lab && typeof lab === "object" ? lab : {}
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
  const criteria = normalizeCriteria(plan.criteria)
  const scenario = plan.scenario || ""
  const environment = plan.environment || ""
  const assets = plan.assets || ""
  const description = plan.useCase || plan.description || ""
  const totalMinutes = tasks.reduce((sum, task) => sum + parseMinutes(task.time), 0)

  return (
    <section className="lab">
      <div className="lab-plan">
        {failed ? (
          <StatusBanner
            tone="error"
            title="Lab generation failed"
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

        {generating ? (
          <StatusBanner tone="busy" title="Generating lab…" message="This updates when review is ready." />
        ) : null}

        <header className="lab-plan-header">
          <h2>{scenario || "Lab plan"}</h2>
          {description && description !== scenario ? <p className="lede">{description}</p> : null}
        </header>

        {(environment || assets) && !generating ? (
          <div className="lab-meta">
            {environment ? (
              <div className="lab-meta-item">
                <span className="lab-meta-label">Environment</span>
                <span className="lab-meta-value">{environment}</span>
              </div>
            ) : null}
            {assets ? (
              <div className="lab-meta-item">
                <span className="lab-meta-label">Assets provided</span>
                <span className="lab-meta-value">{assets}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {scenario && !generating ? (
          <section className="lab-section">
            <h3>Scenario</h3>
            <p>{scenario}</p>
          </section>
        ) : null}

        {tasks.length && !generating ? (
          <section className="lab-section">
            <h3>Tasks</h3>
            <div className="task-list">
              {tasks.map((task, index) => (
                <article key={task.n ?? index} className="task">
                  <div className="task-marker">{task.n ?? index + 1}</div>
                  <div>
                    <h3>{task.title}</h3>
                    <p>{task.detail}</p>
                  </div>
                  {task.time ? <span className="task-time">{task.time}</span> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {criteria.length && !generating ? (
          <section className="lab-section criteria">
            <h3>Success criteria</h3>
            {criteria.map((item) => (
              <div key={item} className="criterion">
                <Icon src={checkCircle} size={16} />
                <span>{item}</span>
              </div>
            ))}
          </section>
        ) : null}

        {!generating && !failed && !tasks.length && !criteria.length && !scenario ? (
          <div className="brief-card">
            <h3>No lab plan yet</h3>
            <p className="hint">Generate or regenerate the lab to load the agent output.</p>
          </div>
        ) : null}
      </div>

      <aside className="lab-settings">
        <div className="lab-summary">
          <h3>Review summary</h3>
          {totalMinutes ? (
            <p>
              <strong>{totalMinutes} min</strong> estimated
            </p>
          ) : null}
          {environment ? <p className="lab-summary-badge">{environment}</p> : null}
          <p className="hint">
            Approve to generate the learner lab guide, or regenerate for a new lab plan from the
            agent.
          </p>
        </div>
        <div className="actions">
          {canGenerate ? (
            <Button variant="accent" onClick={onGenerate} busy={busy || generating} disabled={busy || generating}>
              {busy ? "Submitting…" : "Approve →"}
            </Button>
          ) : null}
          {canRegenerate ? (
            <Button variant="secondary" onClick={onRegenerate} busy={busy || generating} disabled={busy || generating}>
              Regenerate
            </Button>
          ) : null}
        </div>
      </aside>
    </section>
  )
}
