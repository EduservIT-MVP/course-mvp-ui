import { forwardRef } from "react"

/**
 * Apple Design System Button with EduServ IT Brand Alignment.
 * Variants:
 * - "primary": Signature EduServ IT deep navy/indigo with subtle top light highlight
 * - "accent" / "cta": Radiant EduServ IT amber/orange for forward progression
 * - "secondary": Apple-style frosted tonal control with subtle border
 * - "danger" / "error": Apple HIG system destructive red
 * - "ghost": Borderless button with gentle Apple hover pill wash
 */
const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    busy = false,
    loading = false,
    disabled = false,
    className = "",
    type = "button",
    children,
    ...props
  },
  ref
) {
  const isBusy = busy || loading

  const variantMap = {
    primary: "primary",
    accent: "accent",
    cta: "accent",
    secondary: "secondary",
    danger: "danger",
    error: "danger",
    ghost: "ghost",
  }

  const normalizedVariant = variantMap[variant] || "primary"
  const sizeClass = size !== "md" ? `btn-${size}` : ""
  const busyClass = isBusy ? "is-loading" : ""

  const combinedClassName = [
    "btn",
    `btn-${normalizedVariant}`,
    sizeClass,
    busyClass,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button
      ref={ref}
      type={type}
      className={combinedClassName}
      disabled={disabled || isBusy}
      aria-busy={isBusy ? "true" : undefined}
      {...props}
    >
      {isBusy ? (
        <svg
          className="btn-spinner"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" strokeOpacity="0.25" />
          <path d="M12 2.5 A 9.5 9.5 0 0 1 21.5 12" />
        </svg>
      ) : null}
      <span className="btn-content">{children}</span>
    </button>
  )
})

export default Button
