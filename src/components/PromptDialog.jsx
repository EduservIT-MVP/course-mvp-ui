import { useEffect, useId, useRef, useState } from "react"
import Button from "./Button"

/**
 * Modal prompt dialog — text input with Confirm / Cancel.
 */
export default function PromptDialog({
  open,
  title,
  message,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  busy = false,
  placeholder = "",
  initialValue = "",
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const inputRef = useRef(null)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open, initialValue])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) onCancel?.()
      if (event.key === "Enter" && !busy) {
        if (value.trim()) onConfirm?.(value.trim())
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, busy, onCancel, onConfirm, value])

  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel?.()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h3 id={titleId}>{title}</h3>
        {message ? <p className="dialog-message">{message}</p> : null}
        
        <div style={{ marginTop: "16px", marginBottom: "24px" }}>
          <input
            ref={inputRef}
            type="text"
            className="field"
            style={{ width: "100%" }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="dialog-actions">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => onConfirm?.(value.trim())} 
            busy={busy}
            disabled={!value.trim() || busy}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
