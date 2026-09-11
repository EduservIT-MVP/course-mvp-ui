export const ROLES = ["admin", "instructor", "reviewer", "learner"]

const ROLE_PERMISSIONS = {
  admin: ["*"],
  instructor: [
    "course:create",
    "course:list",
    "course:view",
    "course:update",
    "course:delete",
    "plan:generate",
    "plan:approve",
    "plan:regenerate",
    "ppt:generate",
    "ppt:regenerate",
    "ppt:download",
    "lab:generate",
    "lab:approve",
    "lab:regenerate",
    "guide:generate",
    "artifacts:download",
  ],
  reviewer: [
    "course:list",
    "course:view",
    "plan:approve",
    "plan:regenerate",
    "ppt:regenerate",
    "ppt:download",
    "lab:approve",
    "lab:regenerate",
    "artifacts:download",
  ],
  learner: ["course:list", "course:view", "ppt:download", "artifacts:download"],
}

export function can(user, permission) {
  if (!user) return false
  const fromApi = user.permissions
  if (Array.isArray(fromApi) && fromApi.length) {
    return fromApi.includes("*") || fromApi.includes(permission)
  }
  const grants = ROLE_PERMISSIONS[user.role] || []
  return grants.includes("*") || grants.includes(permission)
}

export function roleLabel(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : ""
}
