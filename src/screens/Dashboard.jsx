import { Link, useNavigate } from "react-router-dom"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import { useAuth } from "../auth/context"
import { useCourses } from "../hooks/useCourse"
import { messageFromError } from "../api/errors"
import { statusLabel } from "../workflow/states"

export default function Dashboard() {
  const { can } = useAuth()
  const { courses, loading, error, refresh } = useCourses()
  const navigate = useNavigate()
  const canCreate = can("course:create")

  return (
    <div className="app">
      <Sidebar mode="dashboard" />
      <div className="workspace">
        <Header title="Courses" subtitle="Select a course or start a new brief" />
        <main className="content">
          <section className="brief">
            <div className="brief-intro">
              <h2>Your course workspace</h2>
              <p>
                Continue a generation in progress, review a plan waiting for approval, or open a completed package to download files.
              </p>
            </div>

            {error ? (
              <StatusBanner
                tone="error"
                title="Couldn’t load courses"
                message={messageFromError(error)}
                action={
                  <Button variant="secondary" onClick={() => refresh()}>
                    Retry
                  </Button>
                }
              />
            ) : null}

            <div className="brief-actions">
              <span>
                {loading ? "Loading courses…" : `${courses.length} course${courses.length === 1 ? "" : "s"}`}
              </span>
              {canCreate ? <Button onClick={() => navigate("/courses/new")}>Create course</Button> : null}
            </div>

            {!loading && courses.length === 0 ? (
              <div className="brief-card">
                <h3>No courses yet</h3>
                <p className="hint">
                  {canCreate
                    ? "Create a brief to start the plan, lab, and guide workflow."
                    : "No courses are assigned to your role yet."}
                </p>
              </div>
            ) : (
              <div className="task-list">
                {courses.map((course) => (
                  <Link key={course.id} className="task course-link" to={`/courses/${course.id}`}>
                    <div className="task-marker">{(course.title || "?").charAt(0)}</div>
                    <div>
                      <h3>{course.title}</h3>
                      <p>{statusLabel(course.status)}</p>
                    </div>
                    <span className="task-time">{course.level}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
