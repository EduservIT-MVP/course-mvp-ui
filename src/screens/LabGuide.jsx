import checkCircle from "../assets/check-circle.svg"
import checkSmall from "../assets/check-small.svg"
import fileIcon from "../assets/file.svg"
import Button from "../components/Button"
import Icon from "../components/Icon"
import StatusBanner from "../components/StatusBanner"

export default function LabGuide({
  section,
  onSelectSection,
  guide,
  artifacts = [],
  onDownload,
  onExport,
  generating,
  failed,
  error,
  canDownload,
}) {
  const sections = guide?.sections || []
  const page = sections.find((item) => item.id === section) || sections[0]
  const outcomes = guide?.outcomes || []

  return (
    <section className="guide">
      {failed ? (
        <StatusBanner tone="error" title="Lab guide generation failed" message={error} />
      ) : null}

      {generating ? (
        <StatusBanner
          tone="busy"
          title="Generating the lab guide"
          message="The backend is assembling learner-ready materials. This page will update when the package is complete."
        />
      ) : (
        <div className="banner">
          <div className="banner-msg">
            <Icon src={checkCircle} size={24} />
            <div>
              <h2>Course package complete</h2>
              <p>Slides, facilitator notes, lab assets, and learner guide are ready.</p>
            </div>
          </div>
          <div className="actions">
            {canDownload ? (
              <Button variant="secondary" onClick={onExport} disabled={!artifacts.length}>
                Download All
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <div className="guide-workspace">
        <nav className="guide-nav" aria-label="Lab guide">
          <p className="panel-label">LAB GUIDE</p>
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`guide-section${item.id === (page?.id || section) ? " is-active" : ""}`}
              onClick={() => onSelectSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <article className="guide-page">
          {page ? (
            <>
              <div>
                <p className="guide-kicker">{page.kicker}</p>
                <h2>{page.title}</h2>
              </div>
              <p className="lede">{page.lede}</p>

              {page.id === "overview" && outcomes.length ? (
                <div className="outcomes">
                  <h3>By the end of this lab, you can:</h3>
                  {outcomes.map((item) => (
                    <div key={item} className="outcome">
                      <Icon src={checkSmall} size={15} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div>
                <h3>Generated files</h3>
                <p className="lede" style={{ margin: "12px 0" }}>
                  Downloads use the filenames returned by the backend.
                </p>
                {artifacts.length === 0 ? (
                  <p className="hint">No artifacts are available yet.</p>
                ) : (
                  artifacts.map((file) => (
                    <div key={file.id} className="resource" style={{ marginBottom: 12 }}>
                      <div className="resource-meta">
                        <Icon src={fileIcon} size={20} />
                        <div>
                          <strong>{file.name}</strong>
                          <span>
                            {file.label}
                            {file.sizeLabel ? ` · ${file.sizeLabel}` : ""}
                          </span>
                        </div>
                      </div>
                      {canDownload ? (
                        <button type="button" className="download" onClick={() => onDownload(file)}>
                          Download
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="lede">The lab guide will appear here when generation finishes.</p>
          )}
        </article>
      </div>
    </section>
  )
}
