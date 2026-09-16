import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import logo from "../assets/eduservit-logo.png"
import Button from "../components/Button"
import { messageFromError } from "../api/errors"
import { useAuth } from "../auth/context"

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(event) {
    event.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setBusy(true)
    try {
      await signup({ name: name.trim(), email: email.trim(), password })
      navigate("/", { replace: true })
    } catch (err) {
      setError(messageFromError(err, "Could not create your account."))
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
          <h3>Create account</h3>
          <p className="hint">Sign up to build course briefs, decks, labs, and guides.</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label className="field">
            Name
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </label>
          <label className="field">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="field">
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <Button type="submit" variant="primary" size="lg" busy={busy}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  )
}
