import { WORKFLOW } from "./states"

/**
 * Named UI screens for the course workflow.
 * Workspace renders exactly one of these based on course.status (see resolveWorkflowScreen).
 */
export const SCREEN = {
  COURSE_BRIEF: "COURSE_BRIEF",
  PLAN_GENERATING: "PLAN_GENERATING",
  PLAN_REVIEW: "PLAN_REVIEW",
  PPT_GENERATING: "PPT_GENERATING",
  PPT_READY: "PPT_READY",
  LAB_GENERATING: "LAB_GENERATING",
  LAB_REVIEW: "LAB_REVIEW",
  /** Shown after lab approval when guide has not been started yet (future explicit action). */
  LAB_GUIDE_ACTION: "LAB_GUIDE_ACTION",
  LAB_GUIDE_GENERATING: "LAB_GUIDE_GENERATING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
}

/**
 * status → screen. FAILED always resolves to SCREEN.FAILED;
 * use course.failedScreen only for FailedScreen copy / retry target.
 */
const SCREEN_BY_STATUS = {
  [WORKFLOW.SELECT_COURSE]: SCREEN.COURSE_BRIEF,
  [WORKFLOW.PLAN_GENERATING]: SCREEN.PLAN_GENERATING,
  [WORKFLOW.PLAN_REVIEW]: SCREEN.PLAN_REVIEW,
  [WORKFLOW.WAITING_FOR_APPROVAL]: SCREEN.PLAN_REVIEW,
  [WORKFLOW.PPT_GENERATING]: SCREEN.PPT_GENERATING,
  [WORKFLOW.PPT_READY]: SCREEN.PPT_READY,
  [WORKFLOW.REGENERATE]: SCREEN.PPT_GENERATING,
  [WORKFLOW.LAB_GENERATING]: SCREEN.LAB_GENERATING,
  [WORKFLOW.LAB_REVIEW]: SCREEN.LAB_REVIEW,
  [WORKFLOW.LAB_GUIDE_GENERATING]: SCREEN.LAB_GUIDE_GENERATING,
  [WORKFLOW.COMPLETE]: SCREEN.COMPLETE,
  [WORKFLOW.FAILED]: SCREEN.FAILED,
}

/** Sidebar / header step index (0 brief · 1 ppt · 2 lab · 3 guide) for each screen. */
const SIDEBAR_STEP_BY_SCREEN = {
  [SCREEN.COURSE_BRIEF]: 0,
  [SCREEN.PLAN_GENERATING]: 1,
  [SCREEN.PLAN_REVIEW]: 1,
  [SCREEN.PPT_GENERATING]: 1,
  [SCREEN.PPT_READY]: 1,
  [SCREEN.LAB_GENERATING]: 2,
  [SCREEN.LAB_REVIEW]: 3,
  [SCREEN.LAB_GUIDE_ACTION]: 3,
  [SCREEN.LAB_GUIDE_GENERATING]: 3,
  [SCREEN.COMPLETE]: 4,
  [SCREEN.FAILED]: null, // use failedScreen
}

export function resolveWorkflowScreen(status) {
  if (!status) return SCREEN.COURSE_BRIEF
  return SCREEN_BY_STATUS[status] ?? SCREEN.COURSE_BRIEF
}

/**
 * Sidebar step for the current course. Derived only from status / failedScreen —
 * never from local "which tab did the user click" state.
 */
export function sidebarStepForCourse(course) {
  if (!course) return 0
  if (course.status === WORKFLOW.FAILED) {
    const fs = Number(course.failedScreen)
    return Number.isFinite(fs) ? fs : 0
  }
  const screen = resolveWorkflowScreen(course.status)
  const step = SIDEBAR_STEP_BY_SCREEN[screen]
  return step == null ? 0 : step
}

export function headerMetaForScreen(screen) {
  switch (screen) {
    case SCREEN.COURSE_BRIEF:
      return { header: "Course brief", subtitle: "" }
    case SCREEN.PLAN_GENERATING:
      return { header: "Generating plan", subtitle: "" }
    case SCREEN.PLAN_REVIEW:
      return { header: "Approve plan", subtitle: "" }
    case SCREEN.PPT_GENERATING:
      return { header: "Generating PPT", subtitle: "" }
    case SCREEN.PPT_READY:
      return { header: "Presentation", subtitle: "" }
    case SCREEN.LAB_GENERATING:
      return { header: "Generating lab", subtitle: "" }
    case SCREEN.LAB_REVIEW:
      return { header: "Approve lab", subtitle: "" }
    case SCREEN.LAB_GUIDE_ACTION:
      return { header: "Lab guide", subtitle: "" }
    case SCREEN.LAB_GUIDE_GENERATING:
      return { header: "Generating guide", subtitle: "" }
    case SCREEN.COMPLETE:
      return { header: "Complete", subtitle: "" }
    case SCREEN.FAILED:
      return { header: "Failed", subtitle: "Retry to continue" }
    default:
      return { header: "CourseForge", subtitle: "" }
  }
}
