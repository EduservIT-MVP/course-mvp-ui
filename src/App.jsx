import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider"
import { useAuth } from "./auth/context"
import { RequireAuth, RequirePermission } from "./auth/RequireAuth"
import Login from "./screens/Login"
import Dashboard from "./screens/Dashboard"
import Workspace from "./screens/Workspace"
import Forbidden from "./screens/Forbidden"

function LoginRoute() {
  const { ready, user } = useAuth()
  if (!ready) return <div className="boot"><p>Restoring your session…</p></div>
  if (user) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/forbidden" element={<Forbidden />} />
            <Route
              path="/courses/new"
              element={
                <RequirePermission permission="course:create">
                  <Workspace />
                </RequirePermission>
              }
            />
            <Route
              path="/courses/:courseId"
              element={
                <RequirePermission permission="course:view">
                  <Workspace />
                </RequirePermission>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
