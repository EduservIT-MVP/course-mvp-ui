import StatusBanner from "../components/StatusBanner"

/** Wait state while the course-content agent builds the plan. */
export default function PlanGeneratingScreen({ course }) {
  return (
    <section className="brief">
      <StatusBanner
        tone="busy"
        title="Generating course plan…"
        message={course?.title ? `Working on “${course.title}”. This may take a minute.` : "This updates when the plan is ready. This may take a minute."}
      />
    </section>
  )
}
