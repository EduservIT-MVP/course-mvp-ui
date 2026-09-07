import { createContext, useContext } from "react"

export const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used within AuthProvider")
  return value
}

export function useAuthOptional() {
  return useContext(AuthContext)
}
