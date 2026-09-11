import { forwardRef } from "react"

const Button = forwardRef(function Button({ variant = "primary", className = "", children, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={`btn btn-${variant}${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </button>
  )
})

export default Button
