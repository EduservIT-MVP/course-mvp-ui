import { useMemo, useState } from "react"
import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import { usePptPreview } from "../hooks/usePptPreview"
import { statusLabel, stageLabel } from "../workflow/states"

export default function PptAgent({
  course,
  slideIndex,
  onSelectSlide,
  onRegenerate,
  onRegenerateSlides,
  onApprove,
  onDownloadPpt,
  onStartLab,
  busy,
  downloading,
  generating,
  failed,
  error,
  canApprove,
  canRegenerate,
  canDownloadPpt,
  canStartLab,
  ppt,
  summary,
}) {
  const preview = usePptPreview(course)
  const slides = preview.slides
  const slide = slides[slideIndex] || slides[0]
  const ready = Boolean(slide) && !generating
  const [tagged, setTagged] = useState(() => new Set())
  const [prompt, setPrompt] = useState("")

  const taggedList = useMemo(
    () => slides.filter((item, index) => tagged.has(item.id ?? index)),
    [slides, tagged],
  )

  function toggleTag(id, index, event) {
    event.stopPropagation()
    const key = id ?? index
    setTagged((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleRegenerateTagged() {
    const selected = taggedList.length
      ? taggedList.map((item, index) => ({
          id: item.id,
          index: slides.findIndex((slideItem) => slideItem === item),
        }))
      : slide
        ? [{ id: slide.id, index: slideIndex }]
        : []
    onRegenerateSlides?.({
      slides: selected,
      prompt: prompt.trim(),
      notes: prompt.trim() || slide?.notes || "",
    })
  }

  return (
    <section className="ppt">
      {failed ? (
        <StatusBanner
          tone="error"
          title="PPT generation failed"
          message={error}
          action={
            canRegenerate ? (
              <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
                Retry
              </Button>
            ) : null
          }
        />
      ) : null}

      {generating || preview.loading ? (
        <StatusBanner
          tone="busy"
          title={preview.loading ? "Opening PPTX" : statusLabel(course?.status) || "Generating"}
          message={preview.loading ? "Rendering the generated presentation file." : stageLabel(course)}
        />
      ) : null}

      <div className="status-row">
        <div>
          <h2>
            {generating
              ? "Generating your slide deck"
              : ready
                ? "Your slide deck is ready"
                : "Waiting for the plan"}
          </h2>
          <p>
            {course?.title ? `${course.title}` : "Selected course"}
            {course?.level ? ` · ${course.level}` : ""}
            {course?.duration ? ` · ${course.duration}` : ""}
            {ppt?.name ? ` · ${ppt.name}` : ""}
          </p>
          <p>
            {generating
              ? "Status is coming from the REST API. This screen updates when generation finishes."
              : summary}
          </p>
        </div>
        <div className="actions">
          {canRegenerate ? (
            <Button variant="secondary" onClick={onRegenerate} disabled={busy || generating}>
              {busy ? "Working…" : "Regenerate deck"}
            </Button>
          ) : null}
          {canDownloadPpt ? (
            <Button onClick={onDownloadPpt} disabled={busy || generating || downloading}>
              {downloading ? "Downloading…" : "Download PPT"}
            </Button>
          ) : null}
          {canApprove ? (
            <Button onClick={onApprove} disabled={busy || generating || !ready}>
              {busy ? "Submitting…" : "Approve & generate PPT →"}
            </Button>
          ) : null}
          {canStartLab ? (
            <Button variant={canDownloadPpt ? "secondary" : "primary"} onClick={onStartLab} disabled={busy || generating}>
              {busy ? "Submitting…" : "Generate lab →"}
            </Button>
          ) : null}
        </div>
      </div>

      {generating || !slide ? (
        <div className="brief-card">
          <h3>{generating ? "Generation in progress" : "No slides yet"}</h3>
          <p className="hint">
            {generating
              ? "Leave this page open or come back later — progress is saved on the backend."
              : "Generate a plan from the course brief to review slides here."}
          </p>
        </div>
      ) : (
        <div className="review">
          <aside className="outline">
            <p className="panel-label">SLIDE OUTLINE</p>
            <p className="hint">Tag slides to regenerate them with a prompt.</p>
            {slides.map((item, index) => {
              const key = item.id ?? index
              const isTagged = tagged.has(key)
              return (
                <div
                  key={key}
                  className={`outline-item${index === slideIndex ? " is-active" : ""}${isTagged ? " is-tagged" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isTagged}
                    aria-label={`Tag slide ${index + 1} for regeneration`}
                    onChange={(event) => toggleTag(item.id, index, event)}
                  />
                  <button type="button" className="outline-select" onClick={() => onSelectSlide(index)}>
                    <span className="outline-num">{String(item.id || index + 1).padStart(2, "0")}</span>
                    <span className="outline-title">{item.title}</span>
                  </button>
                </div>
              )
            })}
          </aside>

          <div className="preview-panel">
            <article className="slide pptx-slide">
              <p className="slide-kicker">{slide.kicker}</p>
              {slide.images?.length ? (
                <div className="pptx-media">
                  {slide.images.map((src) => (
                    <img key={src} src={src} alt="" />
                  ))}
                </div>
              ) : null}
              <div>
                <h3>{slide.heading || slide.title}</h3>
                <p className="pptx-body">{slide.body}</p>
              </div>
              <div className="accent-line" />
            </article>
            <div className="notes">
              <h4>SPEAKER NOTES</h4>
              <p>{slide.notes || ppt?.label || "No speaker notes were returned."}</p>
            </div>
            <div className="notes regen-panel">
              <h4>REGENERATE TAGGED SLIDE</h4>
              <p className="hint">
                {taggedList.length
                  ? `${taggedList.length} slide${taggedList.length === 1 ? "" : "s"} tagged`
                  : `No tag yet — current slide ${String(slide.id || slideIndex + 1).padStart(2, "0")} will be sent.`}
              </p>
              <label className="field">
                Prompt / note
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Tell the PPT agent what to change on the tagged slide…"
                />
              </label>
              <Button
                onClick={handleRegenerateTagged}
                disabled={busy || generating || !canRegenerate || !prompt.trim()}
              >
                {busy ? "Sending…" : "Regenerate tagged slide"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
