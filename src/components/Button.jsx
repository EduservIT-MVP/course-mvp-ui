export default function Button({ variant = "primary", children, ...props }) {
  return (
    <button type="button" className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  )
}
