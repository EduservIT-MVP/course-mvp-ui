import { request } from "./client"
import { isMockMode } from "./config"
import { ApiError } from "./errors"
import { mockApi } from "./mockApi"
import { normalizeLogin, normalizeUser } from "./normalize"
import { readSession } from "./session"

export const authService = {
  async login(credentials) {
    const body = {
      email: credentials.email,
      username: credentials.username || credentials.email,
      password: credentials.password,
    }
    const payload = isMockMode() ? mockApi.login(body) : await request("/auth/login", { method: "POST", body })
    const session = normalizeLogin(payload)
    if (!session.token) {
      throw new ApiError("Login succeeded but no access token was returned.", {
        status: 502,
        code: "auth_contract",
      })
    }
    return session
  },

  async logout() {
    if (isMockMode()) return mockApi.logout()
    return request("/auth/logout", { method: "POST", body: {} })
  },

  async me() {
    if (isMockMode()) return { user: normalizeUser(mockApi.me(readSession()?.user).user) }
    const payload = await request("/auth/me")
    return { user: normalizeUser(payload?.user || payload?.data || payload) }
  },
}
