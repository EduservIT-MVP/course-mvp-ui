import { Link } from "react-router-dom"
import sparkles from "../assets/sparkles.svg"
import check from "../assets/check.svg"
import { STEPS } from "../data"
import { statusLabel } from "../workflow/states"

export default function Sidebar({ step = 0, maxStep = 0, onSelect, course, mode = "workflow" }) {
  return (
    <aside className="sidebar">
      <Link to="/" className="brand brand-link">
        <div className="brand-mark">
          <img src={sparkles} alt="" width={17} height={17} />
        </div>
        <p className="brand-name">CourseForge</p>
      </Link>

      {mode === "workflow" ? (
        <nav className="workflow" aria-label="Build workflow">
          <p className="workflow-label">Build workflow</p>
          {STEPS.map((item, index) => {
            const done = index < step
            const active = index === step
            return (
              <button
                key={item.id}
                type="button"
                className={`step${active ? " is-active" : ""}`}
                disabled={index > maxStep}
                onClick={() => onSelect(index)}
              >
                <span className={`step-marker${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
                  {done ? <img src={check} alt="" width={13} height={13} /> : index + 1}
                </span>
                <span className="step-label">{item.label}</span>
              </button>
            )
          })}
        </nav>
      ) : (
        <nav className="workflow" aria-label="Workspace">
          <p className="workflow-label">Workspace</p>
          <Link className="step is-active" to="/">
            <span className="step-marker is-active">1</span>
            <span className="step-label">Courses</span>
          </Link>
        </nav>
      )}

      <div className="project-status">
        <h2>{course?.title || (mode === "dashboard" ? "All courses" : "New course")}</h2>
        <p>{course ? statusLabel(course.status) : "Choose a course to resume its current backend status."}</p>
      </div>
    </aside>
  )
}
