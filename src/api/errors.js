export class ApiError extends Error {
  constructor(message, { status = 500, code = "api_error", details } = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export class AuthError extends ApiError {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message, { status: 401, code: "unauthorized" })
    this.name = "AuthError"
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to do that.") {
    super(message, { status: 403, code: "forbidden" })
    this.name = "ForbiddenError"
  }
}

export function messageFromError(error, fallback = "Something went wrong.") {
  if (!error) return fallback
  return error.message || fallback
}
