// Force HMR refresh
import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import SectionLabel from "../components/SectionLabel"

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
              <SectionLabel className="section-title">Course Details</SectionLabel>
              <div className="brief-card course-details-grid">
                {course.details.map((detail, idx) => (
                  <div key={idx} className={`course-details-item ${idx < 2 ? 'flex-1' : 'flex-auto'}`}>
                    <SectionLabel className="course-details-label">{detail.label}</SectionLabel>
                    <div className="course-details-value">{detail.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artifacts Grid */}
          <div>
            <SectionLabel className="section-title">Artifacts</SectionLabel>
            <div className="artifacts-grid">
              {allItems.map((art) => (
                <div key={art.id} className="artifact-card">
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
        </div>
      )}
    </section>
  )
}
