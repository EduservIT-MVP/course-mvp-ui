import { useCallback, useEffect, useMemo, useState } from "react"
import { authService } from "../api/authService"
import { AuthError } from "../api/errors"
import { clearSession, readSession, writeSession } from "../api/session"
import { setUnauthorizedHandler } from "../api/client"
import { can } from "./permissions"
import { AuthContext } from "./context"

export { useAuth, useAuthOptional } from "./context"

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession())
  const [ready, setReady] = useState(() => !readSession())
  const [error, setError] = useState(null)

  const clear = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(clear)
    return () => setUnauthorizedHandler(null)
  }, [clear])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const current = readSession()
      if (!current?.token) {
        setReady(true)
        return
      }
      try {
        const payload = await authService.me()
        if (cancelled) return
        const next = { ...current, user: payload.user }
        writeSession(next)
        setSession(next)
      } catch (err) {
        if (cancelled) return
        if (err instanceof AuthError) clear()
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    hydrate()
    return () => {
      cancelled = true
    }
  }, [clear])

  const login = useCallback(async (credentials) => {
    setError(null)
    const payload = await authService.login(credentials)
    writeSession(payload)
    setSession(payload)
    return payload
  }, [])

  const signup = useCallback(async (credentials) => {
    setError(null)
    const payload = await authService.signup(credentials)
    writeSession(payload)
    setSession(payload)
    return payload
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Session is cleared locally even if the backend logout call fails.
    }
    clear()
  }, [clear])

  const value = useMemo(
    () => ({
      ready,
      user: session?.user ?? null,
      token: session?.token ?? null,
      error,
      login,
      signup,
      logout,
      can: (permission) => can(session?.user, permission),
    }),
    [ready, session, error, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
