import { useCallback, useEffect, useRef, useState } from "react"
import * as pdfjsLib from "pdfjs-dist"
import { requestBlob } from "../api/client"
import Button from "./Button"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, File } from "lucide-react"

// Worker served as a static file from public/ — no CDN, no import.meta.url transforms
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs?v=2"

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const DOC_MIME  = "application/msword"

function isPdf(mime)  { return (mime || "").includes("pdf") }
function isDocx(mime) { return mime === DOCX_MIME || mime === DOC_MIME || (mime || "").includes("wordprocessingml") }

async function sniffMime(blob, filename) {
  try {
    const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
    if (head[0] === 0x25 && head[1] === 0x50) return "application/pdf"
    if (head[0] === 0x50 && head[1] === 0x4b) return DOCX_MIME
  } catch { /* ignore */ }
  const ext = (filename || "").split(".").pop().toLowerCase()
  if (ext === "pdf")  return "application/pdf"
  if (ext === "docx") return DOCX_MIME
  if (ext === "doc")  return DOC_MIME
  return "application/pdf"
}

// ─────────────────────────────────────────────────────────────────────────────
// CanvasPdfViewer — renders PDF pages directly to <canvas> using pdfjs-dist.
// No react-pdf wrapper; avoids all React-layer crashes / HMR refreshes.
// ─────────────────────────────────────────────────────────────────────────────
function CanvasPdfViewer({ arrayBuffer, onError }) {
  const canvasRef    = useRef(null)
  const pdfRef       = useRef(null)
  const renderTask   = useRef(null)

  const [numPages,    setNumPages]    = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale,       setScale]       = useState(1.3)
  const [loading,     setLoading]     = useState(true)
  const [err,         setErr]         = useState(null)

  // Load PDF document from ArrayBuffer
  useEffect(() => {
    if (!arrayBuffer) return
    let cancelled = false

    setLoading(true)
    setErr(null)

    // Cancel any previous render task before loading a new doc
    if (renderTask.current) {
      renderTask.current.cancel()
      renderTask.current = null
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    loadingTask.promise
      .then((pdf) => {
        if (cancelled) { pdf.destroy(); return }
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setCurrentPage(1)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        if (e?.name === "RenderingCancelledException") return
        const msg = e?.message || "Failed to load PDF."
        setErr(msg)
        onError?.(new Error(msg))
        setLoading(false)
      })

    return () => {
      cancelled = true
      loadingTask.destroy?.()
    }
  }, [arrayBuffer])

  // Render current page to canvas whenever page or scale changes
  useEffect(() => {
    const pdf    = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas || loading) return

    let cancelled = false

    // Cancel any in-flight render
    if (renderTask.current) {
      renderTask.current.cancel()
      renderTask.current = null
    }

    pdf.getPage(currentPage).then((page) => {
      if (cancelled) return

      const viewport = page.getViewport({ scale })
      canvas.width   = viewport.width
      canvas.height  = viewport.height

      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const task = page.render({ canvasContext: ctx, viewport })
      renderTask.current = task

      task.promise
        .then(() => { if (!cancelled) renderTask.current = null })
        .catch((e) => {
          if (e?.name === "RenderingCancelledException") return
          if (cancelled) return
          console.error("PDF render error:", e)
        })
    }).catch((e) => {
      if (cancelled) return
      console.error("PDF getPage error:", e)
    })

    return () => { cancelled = true }
  }, [currentPage, scale, loading])

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1))
  const goToNext = () => setCurrentPage((p) => Math.min(numPages, p + 1))
  const zoomIn   = () => setScale((s) => Math.min(3,   +(s + 0.25).toFixed(2)))
  const zoomOut  = () => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))

  if (err) {
    return (
      <div className="pdf-viewer-state pdf-viewer-error">
        <p>{err}</p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer-root" style={{ height: "100%" }}>
      {/* Toolbar */}
      {!loading && (
        <div className="pdf-viewer-toolbar">
          <div className="pdf-viewer-nav">
            <button type="button" className="pdf-nav-btn" onClick={goToPrev} disabled={currentPage <= 1} aria-label="Previous page">
              <ChevronLeft size={15} />
            </button>
            <span className="pdf-page-label">
              {currentPage} <span className="pdf-page-sep">/</span> {numPages}
            </span>
            <button type="button" className="pdf-nav-btn" onClick={goToNext} disabled={currentPage >= numPages} aria-label="Next page">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="pdf-viewer-zoom">
            <button type="button" className="pdf-nav-btn" onClick={zoomOut} aria-label="Zoom out"><ZoomOut size={15} /></button>
            <span className="pdf-zoom-label">{Math.round(scale * 100)}%</span>
            <button type="button" className="pdf-nav-btn" onClick={zoomIn} aria-label="Zoom in"><ZoomIn size={15} /></button>
          </div>
        </div>
      )}

      <div className="pdf-viewer-canvas">
        {loading && (
          <div className="pdf-viewer-state">
            <span className="pptx-spinner" aria-hidden="true" />
            <span>Loading PDF…</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            display: loading ? "none" : "block",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)",
            borderRadius: 4,
            background: "#fff",
            maxWidth: "100%",
          }}
          aria-label={`PDF page ${currentPage} of ${numPages}`}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DocxViewer — converts DOCX to HTML using mammoth (lazy-loaded)
// ─────────────────────────────────────────────────────────────────────────────
function DocxViewer({ blob, onError }) {
  const [html,    setHtml]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState(null)

  useEffect(() => {
    if (!blob) return
    let cancelled = false
    setLoading(true)
    blob.arrayBuffer()
      .then((buf) => import("mammoth").then(({ default: m }) => m.convertToHtml({ arrayBuffer: buf })))
      .then(({ value }) => { if (!cancelled) setHtml(value) })
      .catch((e) => { if (!cancelled) { setErr(e?.message || "Could not render document."); onError?.(e) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [blob])

  if (loading) return <div className="pdf-viewer-state"><span className="pptx-spinner" aria-hidden="true" /><span>Rendering document…</span></div>
  if (err)     return <div className="pdf-viewer-state pdf-viewer-error"><p>{err}</p></div>
  return (
    <div
      className="docx-viewer-content"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised OOXML→HTML
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentViewer — universal entry point for PDF and DOCX artifacts
// ─────────────────────────────────────────────────────────────────────────────
export default function DocumentViewer({
  courseId,
  artifactId,
  artifactName,
  mimeType: propMimeType,
  onTotalPages,
  onError,
}) {
  const SANE_MIMES = new Set(["application/pdf", DOCX_MIME, DOC_MIME])

  const [pdfBuffer,    setPdfBuffer]    = useState(null)
  const [docxBlob,     setDocxBlob]     = useState(null)
  const [detectedMime, setDetectedMime] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const loadDoc = useCallback(async () => {
    if (!courseId || !artifactId) return
    setLoading(true)
    setError(null)
    setPdfBuffer(null)
    setDocxBlob(null)
    setDetectedMime(null)

    try {
      const { blob, mimeType: responseMime } = await requestBlob(
        `/courses/${courseId}/artifacts/${artifactId}/view`
      )
      if (!blob || blob.size < 4) throw new Error("Document file is empty or unavailable.")

      const mime = propMimeType
        || (SANE_MIMES.has(responseMime) ? responseMime : null)
        || await sniffMime(blob, artifactName)

      setDetectedMime(mime)

      if (isPdf(mime)) {
        const buf = await blob.arrayBuffer()
        setPdfBuffer(buf)
      } else {
        setDocxBlob(blob)
      }
    } catch (e) {
      const msg = e?.message || "Failed to load document."
      setError(msg)
      onError?.(e)
    } finally {
      setLoading(false)
    }
  }, [courseId, artifactId, propMimeType, artifactName])

  useEffect(() => { loadDoc() }, [courseId, artifactId])

  const mime    = detectedMime
  const isReady = !loading && !error

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Fetching state */}
      {loading && (
        <div className="pdf-viewer-state" style={{ flex: 1 }}>
          <span className="pptx-spinner" aria-hidden="true" />
          <span>Loading document…</span>
        </div>
      )}

      {/* Fetch error */}
      {error && !loading && (
        <div className="pdf-viewer-state pdf-viewer-error" style={{ flex: 1 }}>
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={loadDoc}>Retry</Button>
        </div>
      )}

      {/* PDF */}
      {isReady && isPdf(mime) && pdfBuffer && (
        <CanvasPdfViewer
          arrayBuffer={pdfBuffer}
          onError={(e) => setError(e?.message)}
        />
      )}

      {/* DOCX */}
      {isReady && isDocx(mime) && docxBlob && (
        <div className="pdf-viewer-canvas">
          <DocxViewer blob={docxBlob} onError={(e) => setError(e?.message)} />
        </div>
      )}

      {/* Unknown */}
      {isReady && !isPdf(mime) && !isDocx(mime) && (
        <div className="pdf-viewer-state" style={{ flex: 1 }}>
          <FileText size={32} color="var(--muted)" />
          <p style={{ fontSize: 13, margin: 0 }}>Preview not available ({mime || "unknown"}).</p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Use the Download button.</p>
        </div>
      )}
    </div>
  )
}
