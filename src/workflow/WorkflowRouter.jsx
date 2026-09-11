import { resolveWorkflowScreen, SCREEN } from "./screens"

/**
 * Single switch: course.status → which screen slot to render.
 * Pass a `screens` map of SCREEN.* → React node. Missing keys render null.
 *
 * Later steps replace temporary shared components with one component per screen.
 */
export default function WorkflowRouter({ course, screens }) {
  const screen = resolveWorkflowScreen(course?.status)
  return screens[screen] ?? screens[SCREEN.COURSE_BRIEF] ?? null
}

export { SCREEN, resolveWorkflowScreen }
