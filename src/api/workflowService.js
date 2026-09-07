import { request } from "./client"
import { isMockMode } from "./config"
import { mockApi } from "./mockApi"
import { normalizeCourse } from "./normalize"
import { pptService } from "./pptService"
import { readSession } from "./session"
import { WORKFLOW } from "../workflow/states"

function user() {
  return readSession()?.user ?? null
}

export const workflowService = {
  async generatePlan(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.generatePlan(user(), courseId))
    return normalizeCourse(await request(`/courses/${courseId}/plan/generate`, { method: "POST", body: {} }))
  },

  async regeneratePlan(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.regeneratePlan(user(), courseId))
    return normalizeCourse(await request(`/courses/${courseId}/plan/regenerate`, { method: "POST", body: {} }))
  },

  async approvePlan(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.approvePlan(user(), courseId))
    const approved = normalizeCourse(
      await request(`/courses/${courseId}/plan/approve`, { method: "POST", body: {} }),
    )
    if (approved.status === WORKFLOW.WAITING_FOR_APPROVAL || approved.status === WORKFLOW.PLAN_REVIEW) {
      return pptService.generate(courseId)
    }
    return approved
  },
}
