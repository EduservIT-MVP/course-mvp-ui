import Button from "./Button"

/**
 * Shared Approve / Regenerate actions for plan review and lab review.
 * Keep review screens separate; only share this button pair.
 */
export default function ApprovalActions({
  onApprove,
  onRegenerate,
  busy = false,
  canApprove = false,
  canRegenerate = false,
  approveLabel = "Approve",
  regenerateLabel = "Regenerate",
}) {
  if (!canApprove && !canRegenerate) return null

  return (
    <div className="brief-actions">
      {canRegenerate ? (
        <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
          {busy ? "Working…" : regenerateLabel}
        </Button>
      ) : null}
      {canApprove ? (
        <Button onClick={onApprove} disabled={busy}>
          {busy ? "Submitting…" : approveLabel}
        </Button>
      ) : null}
    </div>
  )
}
