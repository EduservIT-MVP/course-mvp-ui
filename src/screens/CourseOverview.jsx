// Force HMR refresh
import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
export default function CourseOverview({
  course,
  artifacts = [],
  onDownload,
  onDownloadSection,
  onExport,
  loading = false,
  error = null,
  canDownload = false,
}) {
  // Only use actual downloadable artifacts
  const allItems = artifacts || []

  // Group into sections
  const sections = [
    { id: "course_brief", label: "Course brief", items: [] },
    { id: "ppt_agent", label: "PPT agent", items: [] },
    { id: "lab_generation", label: "Lab generation", items: [] },
    { id: "lab_guide", label: "Lab guide", items: [] },
    { id: "other", label: "Additional files", items: [] },
  ]

  allItems.forEach(item => {
    const section = sections.find(s => s.id === item.sourceAgent) || sections.find(s => s.id === "other")
    section.items.push(item)
  })

  const visibleSections = sections.filter(s => s.items.length > 0)

  if (loading) {
    return (
      <section className="ppt">
        <StatusBanner tone="busy" title="Loading overview…" message="Please wait." />
      </section>
    )
  }

  if (error) {
    return (
      <section className="ppt">
        <StatusBanner tone="error" title="Could not load overview" message={error} />
      </section>
    )
  }

  return (
    <section className="course-overview-container">
      <div className="course-overview-header status-row">
        <div>
          <h2>Course overview</h2>
          <p>All produced documents and downloadable artifacts</p>
        </div>
        {canDownload && allItems.length > 0 ? (
          <Button variant="accent" onClick={onExport}>
            Download all
          </Button>
        ) : null}
      </div>

      {!allItems.length ? (
        <div className="brief-card no-outputs">
          <h3>No outputs yet</h3>
          <p className="hint">Generate course artifacts to view them here.</p>
        </div>
      ) : (
        <div className="course-overview-content">
          {/* Course Details Block */}
          {course?.details && course.details.length > 0 && (
            <div>
              <h3 className="section-title">Course Details</h3>
              <div className="brief-card course-details-grid">
                {course.details.map((detail, idx) => (
                  <div key={idx} className={`course-details-item ${idx < 2 ? 'flex-1' : 'flex-auto'}`}>
                    <span className="course-details-label">{detail.label}</span>
                    <div className="course-details-value">{detail.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grouped Artifacts Grid */}
          <div className="artifacts-section-container">
            {visibleSections.map(section => (
              <div key={section.id}>
                <div className="artifacts-section-header">
                  <h3 className="section-title" style={{ margin: 0 }}>{section.label}</h3>
                  {canDownload && onDownloadSection && section.id !== "other" ? (
                    <Button variant="secondary" size="sm" onClick={() => onDownloadSection(section.id)}>
                      Download Section
                    </Button>
                  ) : null}
                </div>

                <div className="artifacts-grid">
                  {section.items.map((art) => (
                    <div key={art.id} className="brief-card artifact-card">
                      <div>
                        <h4 className="artifact-title">
                          {art.label || art.name || "Artifact"}
                        </h4>
                        <p className="artifact-subtitle">
                          {art.name}
                        </p>
                        <div className="artifact-badges">
                          <span className="badge">
                            {art.type || "file"}
                          </span>
                          {art.sizeLabel && (
                            <span className="badge">
                              {art.sizeLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      {canDownload ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="artifact-download-btn"
                          onClick={() => onDownload(art)}
                        >
                          <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Download
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
