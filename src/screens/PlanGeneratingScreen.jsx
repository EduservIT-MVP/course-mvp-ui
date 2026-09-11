import StatusBanner from "../components/StatusBanner"

/** Wait state while the course-content agent builds the plan. */
export default function PlanGeneratingScreen({ course }) {
  return (
    <section className="brief">
      <StatusBanner
        tone="busy"
        title="Generating course plan…"
        message={course?.title ? `Working on “${course.title}”.` : "This updates when the plan is ready."}
      />
      <div className="generating-panel" aria-busy="true">
        <span className="pptx-spinner" aria-hidden="true" />
        <div>
          <h3>Building your outline</h3>
          <p className="hint">You’ll review and approve the plan before presentation generation starts.</p>
        </div>
      </div>
    </section>
  )
}
