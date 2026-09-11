import checkCircle from "../assets/check-circle.svg"
import Button from "../components/Button"
import Icon from "../components/Icon"
import StatusBanner from "../components/StatusBanner"

function artifactKind(file) {
  const type = String(file?.type || "").toLowerCase()
  const name = String(file?.name || "").toLowerCase()
  if (type.includes("ppt") || /\.pptx?$/.test(name)) return "ppt"
  if (type.includes("lab-code") || type.includes("code") || /\.(js|ts|zip)$/.test(name)) return "code"
  if (type.includes("guide") || /\.(json|md|pdf)$/.test(name)) return "guide"
  return "file"
}

function ArtifactGlyph({ kind }) {
  // Same viewBox/size for every glyph so icons stay visually consistent.
  if (kind === "ppt") {
    return (
      <svg className="artifact-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="14" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="3" y="4" width="18" height="3" rx="1" fill="currentColor" />
        <path d="M7 11h4v5H7zM13 11h4v2h-4zM13 14h4v2h-4z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "code") {
    return (
      <svg className="artifact-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13 6l-2 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === "guide") {
    return (
      <svg className="artifact-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 3.5h9l3 3V20.5H6z"
          fill="currentColor"
          opacity="0.12"
        />
        <path
          d="M6 3.5h9l3 3V20.5H6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M15 3.5V7h3M8.5 11h7M8.5 14.5h7M8.5 18h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className="artifact-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7l4 4V20.5H7z" fill="currentColor" opacity="0.12" />
      <path d="M7 3.5h7l4 4V20.5H7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadGlyph() {
  return (
    <svg className="artifact-download-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18.5h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Complete / guide view with per-file download cards. */
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

  if (generating) {
    return (
      <section className="guide">
        <StatusBanner tone="busy" title="Generating lab guide…" message="This updates when ready." />
      </section>
    )
  }

  if (failed) {
    return (
      <section className="guide">
        <StatusBanner tone="error" title="Guide generation failed" message={error} />
      </section>
    )
  }

  return (
    <section className="guide">
      <div className="banner">
        <div className="banner-msg">
          <Icon src={checkCircle} size={24} />
          <div>
            <h2>Package ready</h2>
            <p>
              {artifacts.length} file{artifacts.length === 1 ? "" : "s"} available
            </p>
          </div>
        </div>
        <div className="actions">
          {canDownload ? (
            <Button variant="secondary" onClick={onExport} disabled={!artifacts.length}>
              Download all
            </Button>
          ) : null}
        </div>
      </div>

      <div className="guide-workspace">
        {sections.length ? (
          <nav className="guide-nav" aria-label="Lab guide">
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
        ) : null}

        <article className="guide-page">
          {page ? (
            <header className="guide-page-header">
              {page.kicker ? <p className="guide-kicker">{page.kicker}</p> : null}
              <h2>{page.title}</h2>
              {page.lede ? <p className="lede">{page.lede}</p> : null}
            </header>
          ) : (
            <header className="guide-page-header">
              <h2>Downloads</h2>
            </header>
          )}

          {canDownload && artifacts.length ? (
            <section className="artifact-grid" aria-label="Generated files">
              {artifacts.map((file) => {
                const kind = artifactKind(file)
                return (
                  <article key={file.id || file.name} className={`artifact-card artifact-card--${kind}`}>
                    <div className="artifact-card-icon" aria-hidden="true">
                      <ArtifactGlyph kind={kind} />
                    </div>
                    <div className="artifact-card-body">
                      <strong className="artifact-card-label">{file.label || file.name}</strong>
                      {file.sizeLabel ? <span className="artifact-card-meta">{file.sizeLabel}</span> : null}
                      {file.name ? <span className="artifact-card-filename">{file.name}</span> : null}
                    </div>
                    <button
                      type="button"
                      className="artifact-card-download"
                      onClick={() => onDownload(file)}
                      aria-label={`Download ${file.label || file.name}`}
                    >
                      <DownloadGlyph />
                      <span>Download</span>
                    </button>
                  </article>
                )
              })}
            </section>
          ) : null}
        </article>
      </div>
    </section>
  )
}
