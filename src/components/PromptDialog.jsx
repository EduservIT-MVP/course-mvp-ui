import { useEffect, useId, useRef, useState } from "react"
import Button from "./Button"

/**
 * Modal prompt dialog — text input with Confirm / Cancel.
 */
export default function PromptDialog({
  open,
  title,
  message,
  error = null,
  label = "Category name",
  placeholder = "",
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  busy = false,
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
        
        {error ? (
          <div style={{
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            background: "rgba(255, 59, 48, 0.08)", 
            color: "rgba(255, 59, 48, 1)", 
            padding: "10px 14px", 
            borderRadius: "12px", 
            marginBottom: "16px",
            marginTop: "12px",
            fontSize: "13.5px", 
            fontWeight: "500",
            border: "1px solid rgba(255, 59, 48, 0.12)"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span style={{ lineHeight: 1.4 }}>{error}</span>
          </div>
        ) : null}

        <div className="field-floating" style={{ marginTop: "16px", marginBottom: "32px" }}>
          <input
            ref={inputRef}
            type="text"
            id="prompt-dialog-input"
            style={{ width: "100%" }}
            placeholder={placeholder || " "}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
          <label htmlFor="prompt-dialog-input">{label}</label>
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
