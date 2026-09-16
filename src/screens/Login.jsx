import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import logo from "../assets/eduservit-logo.png"
import Button from "../components/Button"
import { messageFromError } from "../api/errors"
import { useAuth } from "../auth/context"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
          <img src={logo} alt="" width={40} height={40} />
        </div>
        <p className="brand-name">EduServ IT</p>
      </div>

      <section className="brief-card login-card">
        <div>
          <h3>Sign in</h3>
          <p className="hint">Sign in with your EduServ IT account.</p>
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
          <Button type="submit" variant="primary" size="lg" busy={busy}>
            {busy ? "Signing in…" : "Continue"}
          </Button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </section>
    </div>
  )
}
