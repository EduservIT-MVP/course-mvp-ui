import Button from "../components/Button"

const LEVELS = ["Beginner", "Intermediate", "Advanced"]
const DURATIONS = ["45 minutes", "90 minutes", "3 hours"]

export default function CourseBrief({
  brief,
  onChange,
  onGenerate,
  busy,
  error,
  readOnly,
  canGenerate,
}) {
  return (
    <section className="brief">
      <div className="brief-card">
        <div className="field-row">
          <label className="field">
            Course title
            <input
              value={brief.title}
              disabled={readOnly}
              onChange={(e) => onChange("title", e.target.value)}
            />
          </label>
          <label className="field">
            Audience
            <input
              value={brief.audience}
              disabled={readOnly}
              onChange={(e) => onChange("audience", e.target.value)}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            Level
            <select
              value={brief.level}
              disabled={readOnly}
              onChange={(e) => onChange("level", e.target.value)}
            >
              {LEVELS.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Duration
            <select
              value={brief.duration}
              disabled={readOnly}
              onChange={(e) => onChange("duration", e.target.value)}
            >
              {DURATIONS.map((duration) => (
                <option key={duration}>{duration}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          Learning objectives
          <textarea
            value={brief.objectives}
            disabled={readOnly}
            onChange={(e) => onChange("objectives", e.target.value)}
          />
        </label>

        <label className="field">
          Topics to cover
          <textarea
            value={brief.topics}
            disabled={readOnly}
            onChange={(e) => onChange("topics", e.target.value)}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="brief-actions">
        <span />
        {canGenerate ? (
          <Button variant="accent" onClick={onGenerate} busy={busy} disabled={busy || !brief.title}>
            {busy ? "Starting…" : "Generate plan →"}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
