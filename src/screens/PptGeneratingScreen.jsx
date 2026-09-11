import StatusBanner from "../components/StatusBanner"

/** Wait state while PPTX is built and slide preview images are rendered. */
export default function PptGeneratingScreen({ course }) {
  const stage = course?.stage || ""
  const detail =
    stage ||
    (course?.title
      ? `Working on “${course.title}” — building the deck and slide previews.`
      : "Building the deck and rendering slide previews. This can take a minute.")

  return (
    <section className="brief">
      <StatusBanner tone="busy" title="Generating presentation…" message={detail} />
      <div className="generating-panel" aria-busy="true">
        <span className="pptx-spinner" aria-hidden="true" />
        <div>
          <h3>Rendering slide previews</h3>
          <p className="hint">
            The presentation screen opens only after the .pptx and per-slide images are ready.
          </p>
        </div>
      </div>
    </section>
  )
}
