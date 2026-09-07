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
  const filled = Object.values(brief).filter(Boolean).length

  return (
    <section className="brief">
      <div className="brief-intro">
        <h2>Create a course from one brief</h2>
        <p>
          Add the core teaching inputs once. CourseForge will turn them into a
          presentation, hands-on lab, and polished learner guide.
        </p>
      </div>

      <div className="brief-card">
        <div>
          <h3>Course essentials</h3>
          <p className="hint">All fields can be refined in later steps.</p>
        </div>

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
        <span>{filled} teaching inputs complete</span>
        {canGenerate ? (
          <Button onClick={onGenerate} disabled={busy || !brief.title}>
            {busy ? "Starting generation…" : "Generate presentation →"}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
