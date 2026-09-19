import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import Button from "../components/Button"
import ConfirmDialog from "../components/ConfirmDialog"
import StatusBanner from "../components/StatusBanner"
import SectionLabel from "../components/SectionLabel"
import { useAuth } from "../auth/context"
import { useCourses } from "../hooks/useCourse"
import { useCategories } from "../hooks/useCategory"
import { courseService } from "../api/courseService"
import { categoryService } from "../api/categoryService"
import { messageFromError } from "../api/errors"
import { statusLabel, statusTone } from "../workflow/states"
import { Edit2, Trash2 } from "lucide-react"
import PromptDialog from "../components/PromptDialog"

export default function Dashboard() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentCategory = searchParams.get("category") || "All"
  const { courses, loading, error, refresh } = useCourses(currentCategory !== "All" ? currentCategory : undefined)
  const canCreate = can("course:create")
  const canDelete = can("course:delete")

  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [toast, setToast] = useState("")

  const { categories: actualCategories, refresh: refreshCategories } = useCategories()
  const [editCategory, setEditCategory] = useState(null)
  const [deleteCategoryState, setDeleteCategoryState] = useState(null)
  const [managingCategory, setManagingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState(null)

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError("")
    try {
      await courseService.remove(pendingDelete.id)
      setPendingDelete(null)
      setToast(`Deleted “${pendingDelete.title || "course"}”.`)
      window.setTimeout(() => setToast(""), 2200)
      await refresh()
    } catch (err) {
      setDeleteError(messageFromError(err, "Could not delete the course."))
    } finally {
      setDeleting(false)
    }
  }

  const confirmEditCategory = async (newName) => {
    try {
      setCategoryError(null)
      setManagingCategory(true)
      await categoryService.update(editCategory.id, newName)
      await refreshCategories()
      window.dispatchEvent(new Event("categories-updated"))
      await refresh()

      if (currentCategory === editCategory.name) {
        searchParams.set("category", newName)
      }
      setEditCategory(null)
    } catch (err) {
      setCategoryError(err.message || "Unknown error occurred")
    } finally {
      setManagingCategory(false)
    }
  }

  const confirmDeleteCategory = async () => {
    try {
      setCategoryError(null)
      setManagingCategory(true)
      await categoryService.remove(deleteCategoryState.id)
      await refreshCategories()
      window.dispatchEvent(new Event("categories-updated"))
      await refresh()

      if (currentCategory === deleteCategoryState.name) {
        searchParams.delete("category")
        setSearchParams(searchParams)
      }
      setDeleteCategoryState(null)
    } catch (err) {
      setCategoryError(err.message || "Unknown error occurred")
    } finally {
      setManagingCategory(false)
    }
  }

  // Use the fetched courses directly; they are pre-filtered by the backend if a category is selected.
  const groupedCourses = courses.reduce((acc, c) => {
    const cat = c.category || "Uncategorized"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  const categories = Object.keys(groupedCourses).sort((a, b) => {
    if (a === "Uncategorized") return 1
    if (b === "Uncategorized") return -1
    return a.localeCompare(b)
  })

  return (
    <div className="app">
      <Sidebar mode="dashboard" />
      <div className="workspace">
        <Header title={currentCategory === "All" ? "Courses" : `${currentCategory} Courses`} subtitle="Select a course or start a new brief" />
        <main className="content">
          <section className="brief">
            <div className="brief-intro">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h2 style={{ margin: 0 }}>{currentCategory === "All" ? "Your courses" : "Courses"}</h2>
                {currentCategory !== "All" && (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      onClick={() => {
                        const actualCat = actualCategories.find(c => c.name === currentCategory)
                        if (actualCat) {
                          setCategoryError(null)
                          setEditCategory(actualCat)
                        }
                      }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px", display: "flex", alignItems: "center" }}
                      title="Rename category"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        const actualCat = actualCategories.find(c => c.name === currentCategory)
                        if (actualCat) {
                          setCategoryError(null)
                          setDeleteCategoryState(actualCat)
                        }
                      }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px", display: "flex", alignItems: "center" }}
                      title="Delete category"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              <p style={{ marginTop: "12px" }}>Open a course to continue the plan → presentation → lab workflow.</p>
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

            {deleteError ? (
              <StatusBanner tone="error" title="Delete failed" message={deleteError} />
            ) : null}

            <div className="brief-actions">
              <span className="meta-count">
                {loading ? "Loading…" : `${courses.length} course${courses.length === 1 ? "" : "s"}`}
              </span>
              {canCreate && courses.length > 0 ? (
                <Button
                  onClick={() => navigate(currentCategory === "All" ? "/courses/new" : `/courses/new?category=${encodeURIComponent(currentCategory)}`)}
                >
                  Create course
                </Button>
              ) : null}
            </div>

            {loading ? (
              <div className="task-list" aria-busy="true" aria-label="Loading courses">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="task course-row skeleton-row">
                    <div className="skeleton skeleton-avatar" />
                    <div className="skeleton-lines">
                      <div className="skeleton skeleton-line w-60" />
                      <div className="skeleton skeleton-line w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="brief-card empty-card">
                <h3>No courses yet</h3>
                <p className="hint">
                  {canCreate
                    ? "Start with a brief — we’ll generate the plan, deck, and lab package."
                    : "No courses are assigned to your role yet."}
                </p>
                {canCreate ? (
                  <Button variant="accent" onClick={() => navigate(currentCategory === "All" ? "/courses/new" : `/courses/new?category=${encodeURIComponent(currentCategory)}`)} style={{ marginTop: 8 }}>
                    Create your first course →
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grouped-courses">
                {categories.map((cat) => (
                  <div key={cat} className="course-category">
                    <SectionLabel className="category-title">{cat}</SectionLabel>
                    <div className="task-list">
                      {groupedCourses[cat].map((course) => (
                        <div key={course.id} className="task course-row">
                          <Link className="course-link course-row-main" to={`/courses/${course.id}`}>
                            <div className="task-marker">{(course.title || "?").charAt(0)}</div>
                            <div className="course-copy">
                              <h3>{course.title}</h3>
                              <div className="course-meta">
                                <span className={`status-chip tone-${statusTone(course.status)}`}>
                                  {statusLabel(course.status)}
                                </span>
                                {course.level ? <span className="meta-dot">{course.level}</span> : null}
                              </div>
                            </div>
                          </Link>
                          {canDelete ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="course-delete-btn"
                              aria-label={`Delete ${course.title || "course"}`}
                              onClick={() => {
                                setDeleteError("")
                                setPendingDelete(course)
                              }}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this course?"
        message={
          pendingDelete
            ? `“${pendingDelete.title || "Untitled course"}” and all of its generated files will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete course"
        cancelLabel="Keep course"
        busy={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <PromptDialog
        open={!!editCategory}
        title="Rename Category"
        message="Enter a new name for this category."
        error={categoryError}
        initialValue={editCategory ? editCategory.name : ""}
        placeholder="Category name"
        confirmLabel="Rename"
        busy={managingCategory}
        onConfirm={confirmEditCategory}
        onCancel={() => {
          setEditCategory(null)
          setCategoryError(null)
        }}
      />

      <ConfirmDialog
        open={!!deleteCategoryState}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${deleteCategoryState?.name}"? Any courses in this category will be moved to Uncategorized.`}
        error={categoryError}
        confirmLabel="Delete Category"
        variant="danger"
        busy={managingCategory}
        onConfirm={confirmDeleteCategory}
        onCancel={() => {
          setDeleteCategoryState(null)
          setCategoryError(null)
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
