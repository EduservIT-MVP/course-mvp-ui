import { Link } from "react-router-dom"
import avatar from "../assets/avatar.svg"
import { useAuthOptional } from "../auth/context"
import { roleLabel } from "../auth/permissions"
import Button from "./Button"

/**
 * Apple-style header bar with breadcrumbs navigation.
 * Matches: Workspace  /  Courses  /  [Course Name]
 */
export default function Header({
  title,
  subtitle,
  course = null,
  breadcrumbs = null,
  actions = null,
}) {
  const auth = useAuthOptional()
  const user = auth?.user

  // Resolve breadcrumbs items
  const items = breadcrumbs || (
    course
      ? [
        { label: "Workspace", to: "/" },
        { label: "Courses", to: "/" },
        { label: course.title || title || "Course", isCurrent: true },
      ]
      : [
        { label: "Workspace", to: "/" },
        { label: title || "Courses", isCurrent: true },
      ]
  )

  return (
    <header className="header">
      <div className="header-copy">
        <nav className="header-breadcrumbs" aria-label="Breadcrumb">
          {items.map((item, index) => (
            <span key={`crumb-${index}`} className="breadcrumb-group">
              {index > 0 ? (
                <span className="breadcrumb-sep" aria-hidden="true">
                  /
                </span>
              ) : null}
              {item.isCurrent || !item.to ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

      </div>

      <div className="header-right">
        {actions ? <div className="header-actions">{actions}</div> : null}
        <div className="profile">
          <img src={avatar} alt="" width={32} height={32} />
          <div className="profile-meta">
            <span>{user?.name || "Signed in"}</span>
            {user?.role ? <small>{roleLabel(user.role)}</small> : null}
          </div>
          {auth?.user ? (
            <Button variant="ghost" size="sm" onClick={auth.logout}>
              Log out
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
