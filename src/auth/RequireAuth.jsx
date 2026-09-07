import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./context"

export function RequireAuth() {
  const { ready, user } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="boot">
        <p>Restoring your session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RequirePermission({ permission, children }) {
  const { can } = useAuth()
  if (!can(permission)) return <Navigate to="/forbidden" replace />
  return children
}
