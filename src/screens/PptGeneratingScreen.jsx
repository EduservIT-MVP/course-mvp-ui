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
      <StatusBanner tone="busy" title={course?.stage?.includes("plan") ? "Drafting presentation plan…" : "Generating presentation…"} message={detail + " This may take a few minutes depending on the AI model."} />
    </section>
  )
}
