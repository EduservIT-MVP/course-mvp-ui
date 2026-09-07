import checkCircle from "../assets/check-circle.svg"
import Button from "../components/Button"
import Icon from "../components/Icon"
import StatusBanner from "../components/StatusBanner"

export default function LabGeneration({
  lab,
  tasks = [],
  criteria = [],
  onChange,
  onBack,
  onGenerate,
  onRegenerate,
  busy,
  generating,
  failed,
  error,
  canGenerate,
  canRegenerate,
}) {
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
          <StatusBanner
            tone="busy"
            title="Generating lab materials"
            message="Lab code is being produced by the backend. This view will refresh when review is ready."
          />
        ) : null}

        <div>
          <h2>{lab.scenario || "Build an agent workflow"}</h2>
          <p className="lede">
            A guided lab that turns the presentation concepts into a working
            product-research agent.
          </p>
        </div>

        <div className="task-list">
          {tasks.map((task) => (
            <article key={task.n} className="task">
              <div className="task-marker">{task.n}</div>
              <div>
                <h3>{task.title}</h3>
                <p>{task.detail}</p>
              </div>
              <span className="task-time">{task.time}</span>
            </article>
          ))}
        </div>

        {criteria.length ? (
          <div className="criteria">
            <h3>Success criteria</h3>
            {criteria.map((item) => (
              <div key={item} className="criterion">
                <Icon src={checkCircle} size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="lab-settings">
        <h3>Lab settings</h3>
        <label className="field">
          Scenario
          <input
            value={lab.scenario}
            disabled={generating}
            onChange={(e) => onChange("scenario", e.target.value)}
          />
        </label>
        <label className="field">
          Environment
          <select
            value={lab.environment}
            disabled={generating}
            onChange={(e) => onChange("environment", e.target.value)}
          >
            <option>Browser workspace</option>
            <option>Local IDE</option>
            <option>Cloud notebook</option>
          </select>
        </label>
        <label className="field">
          Starter assets
          <textarea
            value={lab.assets}
            disabled={generating}
            onChange={(e) => onChange("assets", e.target.value)}
          />
        </label>
        {error && !failed ? <p className="form-error">{error}</p> : null}
        <div className="actions">
          {canGenerate ? (
            <Button onClick={onGenerate} disabled={busy || generating}>
              {busy ? "Submitting…" : "Generate lab guide →"}
            </Button>
          ) : null}
          {canRegenerate ? (
            <Button variant="secondary" onClick={onRegenerate} disabled={busy || generating}>
              Regenerate lab
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onBack}>
            Back to slides
          </Button>
        </div>
      </aside>
    </section>
  )
}
