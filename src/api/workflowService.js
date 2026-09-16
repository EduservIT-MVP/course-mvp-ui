import { request } from "./client"
import { normalizeCourse } from "./normalize"
import { pptService } from "./pptService"
import { WORKFLOW } from "../workflow/states"

export const workflowService = {
  async generatePlan(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/plan/generate`, { method: "POST", body: {} }))
  },

  async regeneratePlan(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/plan/regenerate`, { method: "POST", body: {} }))
  },

  async approvePlan(courseId) {
    const approved = normalizeCourse(
      await request(`/courses/${courseId}/plan/approve`, { method: "POST", body: {} }),
    )
    if (approved.status === WORKFLOW.WAITING_FOR_APPROVAL || approved.status === WORKFLOW.PLAN_REVIEW) {
      return pptService.generate(courseId)
    }
    return approved
  },
}
