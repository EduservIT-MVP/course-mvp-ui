export default function SectionLabel({ children, className = "", ...props }) {
  return (
    <span className={`section-label ${className}`} {...props}>
      {children}
    </span>
  )
}
