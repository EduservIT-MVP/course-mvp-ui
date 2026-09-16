import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider"
import { useAuth } from "./auth/context"
import { RequireAuth, RequirePermission } from "./auth/RequireAuth"

const Login = lazy(() => import("./screens/Login"))
const Signup = lazy(() => import("./screens/Signup"))
const Dashboard = lazy(() => import("./screens/Dashboard"))
const Workspace = lazy(() => import("./screens/Workspace"))
const Forbidden = lazy(() => import("./screens/Forbidden"))

function PageLoader() {
  return <div className="boot" role="status">Loading workspace…</div>
}

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
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
