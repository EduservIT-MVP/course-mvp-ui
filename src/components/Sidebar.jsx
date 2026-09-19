import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import logo from "../assets/eduservit-logo.png"
import { FileText, Presentation, Beaker, BookOpen, LayoutDashboard, Book, Plus, Folder } from "lucide-react"
import { STEPS } from "../data"
import { statusLabel, statusTone } from "../workflow/states"
import SectionLabel from "./SectionLabel"
import PromptDialog from "./PromptDialog"
import { useCategories } from "../hooks/useCategory"
import { categoryService } from "../api/categoryService"

const STEP_ICONS = [FileText, Presentation, Beaker, BookOpen, LayoutDashboard]

export default function Sidebar({ step = 0, maxStep = 0, onSelect, course, mode = "workflow" }) {
  const { categories, refresh: refreshCategories } = useCategories()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [promptOpen, setPromptOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [promptError, setPromptError] = useState(null)
  const currentCategory = searchParams.get("category") || "All"

  const handleAddCategory = () => {
    setPromptError(null)
    setPromptOpen(true)
  }

  const handleConfirmCategory = async (name) => {
    try {
      setPromptError(null)
      setCreating(true)
      await categoryService.create(name)
      await refreshCategories()
      window.dispatchEvent(new Event("categories-updated"))
      setPromptOpen(false)
    } catch (err) {
      setPromptError(err.message || "Unknown error occurred")
    } finally {
      setCreating(false)
    }
  }

  const selectCategory = (catName) => {
    if (catName === "All") {
      searchParams.delete("category")
    } else {
      searchParams.set("category", catName)
    }
    setSearchParams(searchParams)
  }

  return (
    <aside className="sidebar">
      <Link to="/" className="brand brand-link">
        <div className="brand-mark">
          <img src={logo} alt="" width={40} height={40} />
        </div>
        <p className="brand-name">EduServ IT</p>
      </Link>

      {mode === "workflow" ? (
        <nav className="workflow" aria-label="Build workflow">
          <SectionLabel className="workflow-label">Build workflow</SectionLabel>
          {STEPS.map((item, index) => {
            const done = index < step
            const active = index === step
            const Icon = STEP_ICONS[index] || FileText
            return (
              <button
                key={item.id}
                type="button"
                className={`step${active ? " is-active" : ""}`}
                onClick={() => onSelect(index)}
              >
                <span className={`step-marker${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
                  <Icon size={16} strokeWidth={2.5} />
                </span>
                <span className="step-label">{item.label}</span>
              </button>
            )
          })}
        </nav>
      ) : (
        <nav className="workflow" aria-label="Workspace">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingRight: "12px" }}>
            <SectionLabel className="workflow-label" style={{ margin: 0 }}>Workspace</SectionLabel>
            <button 
              onClick={handleAddCategory}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px" }}
              title="Add Category"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <button 
            className={`step ${currentCategory === "All" ? "is-active" : ""}`} 
            onClick={() => selectCategory("All")}
            style={{ width: "100%", border: "none", textAlign: "left", cursor: "pointer" }}
          >
            <span className={`step-marker ${currentCategory === "All" ? "is-active" : ""}`}>
              <Book size={16} strokeWidth={2.5} />
            </span>
            <span className="step-label">All Courses</span>
          </button>

          {categories.map(cat => (
            <button 
              key={cat.id}
              className={`step ${currentCategory === cat.name ? "is-active" : ""}`} 
              onClick={() => selectCategory(cat.name)}
              style={{ width: "100%", border: "none", textAlign: "left", cursor: "pointer" }}
            >
              <span className={`step-marker ${currentCategory === cat.name ? "is-active" : ""}`}>
                <Folder size={16} strokeWidth={2.5} />
              </span>
              <span className="step-label">{cat.name}</span>
            </button>
          ))}
        </nav>
      )}

      {mode === "workflow" ? (
        <div className="project-status">
          <h2>{course?.title || "New course"}</h2>
          <p>
            {course ? (
              <span className={`status-chip tone-${statusTone(course.status)}`}>
                {statusLabel(course.status)}
              </span>
            ) : (
              "New course"
            )}
          </p>
        </div>
      ) : null}

      <PromptDialog
        open={promptOpen}
        title="Add Category"
        message="Enter a name for the new workspace category."
        error={promptError}
        placeholder="e.g., Sales, Engineering"
        confirmLabel="Create"
        busy={creating}
        onConfirm={handleConfirmCategory}
        onCancel={() => {
          setPromptOpen(false)
          setPromptError(null)
        }}
      />
    </aside>
  )
}
