import { request } from "./client"
import { ApiError } from "./errors"
import { normalizeLogin, normalizeUser } from "./normalize"

export const authService = {
  async login(credentials) {
    const body = {
      email: credentials.email,
      username: credentials.username || credentials.email,
      password: credentials.password,
    }
    const payload = await request("/auth/login", { method: "POST", body })
    const session = normalizeLogin(payload)
    if (!session.token) {
      throw new ApiError("Login succeeded but no access token was returned.", {
        status: 502,
        code: "auth_contract",
      })
    }
    return session
  },

  async signup(credentials) {
    const body = {
      email: credentials.email,
      password: credentials.password,
      name: credentials.name || "",
    }
    const payload = await request("/auth/signup", { method: "POST", body })
    const session = normalizeLogin(payload)
    if (!session.token) {
      throw new ApiError("Signup succeeded but no access token was returned.", {
        status: 502,
        code: "auth_contract",
      })
    }
    return session
  },

  async logout() {
    return request("/auth/logout", { method: "POST", body: {} })
  },

  async me() {
    const payload = await request("/auth/me")
    return { user: normalizeUser(payload?.user || payload?.data || payload) }
  },
}
