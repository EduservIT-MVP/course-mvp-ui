import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import sparkles from "../assets/sparkles.svg"
import Button from "../components/Button"
import { isMockMode } from "../api/config"
import { messageFromError } from "../api/errors"
import { DEMO_PASSWORD, DEMO_USERS } from "../auth/demoUsers"
import { useAuth } from "../auth/context"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(isMockMode() ? DEMO_USERS[0].email : "")
  const [password, setPassword] = useState(isMockMode() ? DEMO_PASSWORD : "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await login({ email, password })
      const dest = location.state?.from?.pathname || "/"
      navigate(dest, { replace: true })
    } catch (err) {
      setError(messageFromError(err, "Sign-in failed."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="brand">
        <div className="brand-mark">
          <img src={sparkles} alt="" width={17} height={17} />
        </div>
        <p className="brand-name">CourseForge</p>
      </div>

      <section className="brief-card login-card">
        <div>
          <h3>Sign in</h3>
          <p className="hint">
            {isMockMode()
              ? `UI preview login: ${DEMO_USERS[0].email} / ${DEMO_PASSWORD}`
              : "Sign in with your backend account."}
          </p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label className="field">
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </section>
    </div>
  )
}
