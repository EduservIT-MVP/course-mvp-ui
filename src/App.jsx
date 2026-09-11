import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider"
import { useAuth } from "./auth/context"
import { RequireAuth, RequirePermission } from "./auth/RequireAuth"
import Login from "./screens/Login"
import Signup from "./screens/Signup"
import Dashboard from "./screens/Dashboard"
import Workspace from "./screens/Workspace"
import Forbidden from "./screens/Forbidden"

function GuestOnly({ children }) {
  const { ready, user } = useAuth()
  if (!ready) return <div className="boot"><p>Restoring your session…</p></div>
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Login />
              </GuestOnly>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestOnly>
                <Signup />
              </GuestOnly>
            }
          />
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
