export const WORKFLOW = {
  // Must match backend /courses status strings exactly.
  SELECT_COURSE: "SELECT_COURSE",
  PLAN_GENERATING: "PLAN_GENERATING",
  PLAN_REVIEW: "PLAN_REVIEW",
  WAITING_FOR_APPROVAL: "WAITING_FOR_APPROVAL",
  PPT_GENERATING: "PPT_GENERATING",
  PPT_READY: "PPT_READY",
  LAB_GENERATING: "LAB_GENERATING",
  LAB_REVIEW: "LAB_REVIEW",
  LAB_GUIDE_GENERATING: "LAB_GUIDE_GENERATING",
  COMPLETE: "COMPLETE",
  REGENERATE: "REGENERATE",
  FAILED: "FAILED",
}

/** Statuses that should drive useCoursePolling. */
export const GENERATING_STATUSES = new Set([
  WORKFLOW.PLAN_GENERATING,
  WORKFLOW.PPT_GENERATING,
  WORKFLOW.LAB_GENERATING,
  WORKFLOW.LAB_GUIDE_GENERATING,
  WORKFLOW.REGENERATE,
])

/** Sidebar step index (0–3). Prefer sidebarStepForCourse(course) from screens.js. */
const SIDEBAR_STEP_BY_STATUS = {
  [WORKFLOW.SELECT_COURSE]: 0,
  [WORKFLOW.PLAN_GENERATING]: 1,
  [WORKFLOW.PLAN_REVIEW]: 1,
  [WORKFLOW.WAITING_FOR_APPROVAL]: 1,
  [WORKFLOW.PPT_GENERATING]: 1,
  [WORKFLOW.PPT_READY]: 1,
  [WORKFLOW.REGENERATE]: 1,
  [WORKFLOW.LAB_GENERATING]: 2,
  [WORKFLOW.LAB_REVIEW]: 3,
  [WORKFLOW.LAB_GUIDE_GENERATING]: 3,
  [WORKFLOW.COMPLETE]: 4,
}

export function isGenerating(status) {
  return GENERATING_STATUSES.has(status)
}

export function screenForStatus(status, failedScreen = 0) {
  if (status === WORKFLOW.FAILED) return failedScreen
  return SIDEBAR_STEP_BY_STATUS[status] ?? 0
}

export function maxStepForStatus(status, failedScreen = 0) {
  return screenForStatus(status, failedScreen)
}

export function statusLabel(status) {
  switch (status) {
    case WORKFLOW.SELECT_COURSE:
      return "Draft brief"
    case WORKFLOW.PLAN_GENERATING:
      return "Generating course plan"
    case WORKFLOW.PLAN_REVIEW:
    case WORKFLOW.WAITING_FOR_APPROVAL:
      return "Waiting for approval"
    case WORKFLOW.PPT_GENERATING:
      return "Generating presentation"
    case WORKFLOW.PPT_READY:
      return "PPT ready"
    case WORKFLOW.LAB_GENERATING:
      return "Generating lab"
    case WORKFLOW.LAB_REVIEW:
      return "Lab review"
    case WORKFLOW.LAB_GUIDE_GENERATING:
      return "Generating lab guide"
    case WORKFLOW.COMPLETE:
      return "Complete"
    case WORKFLOW.REGENERATE:
      return "Regenerating"
    case WORKFLOW.FAILED:
      return "Generation failed"
    default:
      return status || "In progress"
  }
}

/** Visual tone for status chips (Dashboard / Sidebar). */
export function statusTone(status) {
  if (isGenerating(status)) return "busy"
  switch (status) {
    case WORKFLOW.COMPLETE:
      return "success"
    case WORKFLOW.FAILED:
      return "error"
    case WORKFLOW.PLAN_REVIEW:
    case WORKFLOW.WAITING_FOR_APPROVAL:
    case WORKFLOW.LAB_REVIEW:
      return "warn"
    case WORKFLOW.PPT_READY:
      return "ready"
    default:
      return "neutral"
  }
}

export function stageLabel(course) {
  if (course?.stage) return String(course.stage)
  return statusLabel(course?.status)
}
