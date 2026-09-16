import { API_BASE_URL } from "./config"
import { AuthError, ForbiddenError, ApiError } from "./errors"
import { clearSession, getToken } from "./session"

let onUnauthorized = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function filenameFromDisposition(disposition) {
  const match = String(disposition || "").match(/filename\*?=(?:UTF-8''|"?)([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : null
}

export async function request(path, { method = "GET", body, headers, signal } = {}) {
  if (!API_BASE_URL) {
    throw new ApiError("Set VITE_API_BASE_URL in .env to the URL of your Flask API.", {
      status: 0,
      code: "config",
    })
  }
  let response
  try {
    const token = getToken()
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Cannot reach the backend. Check VITE_API_BASE_URL and that the API is running.", {
      status: 0,
      code: "network",
    })
  }

  const payload = await parseBody(response)

  if (response.status === 401) {
    clearSession()
    onUnauthorized?.()
    throw new AuthError(payload?.message || payload?.error)
  }

  if (response.status === 403) {
    throw new ForbiddenError(payload?.message || payload?.error)
  }

  if (!response.ok) {
    throw new ApiError(payload?.message || payload?.error || `Request failed (${response.status})`, {
      status: response.status,
      code: payload?.code,
      details: payload,
    })
  }

  return payload
}

export async function requestBlob(path, { headers, auth = true } = {}) {
  let response
  try {
    const token = getToken()
    response = await fetch(path.startsWith("http") ? path : `${API_BASE_URL}${path}`, {
      headers: {
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  } catch {
    throw new ApiError("Download failed. The file service could not be reached.", {
      status: 0,
      code: "network",
    })
  }

  if (response.status === 401) {
    clearSession()
    onUnauthorized?.()
    throw new AuthError()
  }

  if (response.status === 403) {
    throw new ForbiddenError()
  }

  if (!response.ok) {
    throw new ApiError("Download failed.", { status: response.status })
  }

  const blob = await response.blob()
  const filename = filenameFromDisposition(response.headers.get("Content-Disposition"))
  const mimeType = response.headers.get("Content-Type") || blob.type
  return { blob, filename, mimeType }
}
