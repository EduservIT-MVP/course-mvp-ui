import { WORKFLOW } from "../workflow/states"

const STATUS_ALIASES = {
  select_course: WORKFLOW.SELECT_COURSE,
  draft: WORKFLOW.SELECT_COURSE,
  plan_generating: WORKFLOW.PLAN_GENERATING,
  generating_plan: WORKFLOW.PLAN_GENERATING,
  plan_review: WORKFLOW.PLAN_REVIEW,
  waiting_for_approval: WORKFLOW.WAITING_FOR_APPROVAL,
  pending_approval: WORKFLOW.WAITING_FOR_APPROVAL,
  ppt_generating: WORKFLOW.PPT_GENERATING,
  generating: WORKFLOW.PPT_GENERATING,
  generating_ppt: WORKFLOW.PPT_GENERATING,
  content_generating: WORKFLOW.PPT_GENERATING,
  ppt_ready: WORKFLOW.PPT_READY,
  presentation_ready: WORKFLOW.PPT_READY,
  lab_generating: WORKFLOW.LAB_GENERATING,
  lab_review: WORKFLOW.LAB_REVIEW,
  lab_guide_generating: WORKFLOW.LAB_GUIDE_GENERATING,
  complete: WORKFLOW.COMPLETE,
  completed: WORKFLOW.COMPLETE,
  regenerate: WORKFLOW.REGENERATE,
  failed: WORKFLOW.FAILED,
  error: WORKFLOW.FAILED,
}

export function unwrap(payload, keys = []) {
  if (payload == null) return payload
  if (Array.isArray(payload)) return payload
  for (const key of keys) {
    if (payload[key] !== undefined) return payload[key]
  }
  if (payload.data !== undefined) return unwrap(payload.data, keys)
  return payload
}

export function normalizeStatus(status) {
  if (!status) return WORKFLOW.SELECT_COURSE
  const raw = String(status)
  if (Object.values(WORKFLOW).includes(raw)) return raw
  return STATUS_ALIASES[raw.toLowerCase()] || raw
}

export function normalizeUser(user) {
  if (!user) return null
  const role = user.role || user.roles?.[0] || user.userRole || "instructor"
  const permissions = user.permissions || user.scopes || user.grants || []
  return {
    ...user,
    id: user.id || user.userId || user.sub,
    email: user.email || user.username || "",
    name: user.name || user.fullName || user.displayName || user.email || "Signed in",
    role: String(role).toLowerCase(),
    permissions: Array.isArray(permissions) ? permissions : [],
  }
}

export function normalizeLogin(payload) {
  const data = unwrap(payload)
  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.jwt ||
    payload?.token
  const user = normalizeUser(data?.user || data?.account || data?.profile || payload?.user)
  return { token, user, raw: payload }
}

export function normalizeArtifact(item) {
  if (!item) return null
  return {
    ...item,
    id: item.id || item.fileId || item.artifactId,
    fileId: item.fileId || item.id,
    type: item.type || item.kind || item.category,
    name: item.name || item.filename || item.fileName || item.title || "download",
    label: item.label || item.description || item.type || "Generated file",
    sizeLabel: item.sizeLabel || item.size || item.contentLength,
    mimeType: item.mimeType || item.contentType || item.mime,
    downloadUrl: item.downloadUrl || item.signedUrl || item.url || item.href,
  }
}

export function normalizeCourse(payload) {
  const course = unwrap(payload, ["course"])
  if (!course || typeof course !== "object") return course
  const artifacts = (course.artifacts || course.files || course.outputs || []).map(normalizeArtifact)
  const ppt = course.ppt || course.presentation || artifacts.find((item) => isPptArtifact(item))
  const slideImages = Array.isArray(course.slideImages)
    ? course.slideImages
    : Array.isArray(course.slide_images)
      ? course.slide_images
      : []
  return {
    ...course,
    id: course.id || course.courseId || course.uuid,
    status: normalizeStatus(course.status || course.state || course.workflowStatus),
    title: course.title || course.name || course.courseTitle || "Untitled course",
    plan: course.plan || course.coursePlan,
    lab: course.lab || course.labPlan,
    guide: course.guide || course.labGuide,
    artifacts,
    ppt: ppt ? normalizeArtifact(ppt) : null,
    slideImages,
    error: course.error || course.errorMessage || course.failureReason,
    failedScreen: course.failedScreen ?? course.failedStage ?? 0,
    stage: course.stage || course.currentStage || course.progressStage,
  }
}

export function normalizeCourseList(payload) {
  const list = unwrap(payload, ["courses", "items", "results"])
  return (Array.isArray(list) ? list : []).map(normalizeCourse)
}

export function isPptArtifact(item) {
  if (!item) return false
  const type = String(item.type || item.kind || "").toLowerCase()
  const name = String(item.name || item.filename || "")
  return type.includes("ppt") || type.includes("presentation") || /\.pptx?$/i.test(name)
}
