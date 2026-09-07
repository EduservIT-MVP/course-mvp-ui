export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")

export function isMockMode() {
  const flag = import.meta.env.VITE_USE_MOCK
  if (flag === "false") return false
  if (flag === "true") return true
  return !API_BASE_URL
}
