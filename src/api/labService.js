import { request } from "./client"
import { normalizeCourse } from "./normalize"

export const labService = {
  async generatePlan(courseId, lab) {
    return normalizeCourse(await request(`/courses/${courseId}/lab-plan/generate`, { method: "POST", body: lab || {} }))
  },

  async regeneratePlan(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/lab-plan/regenerate`, { method: "POST", body: {} }))
  },

  async approvePlan(courseId) {
    const approved = normalizeCourse(await request(`/courses/${courseId}/lab-plan/approve`, { method: "POST", body: {} }))
    if (approved.status === "LAB_PLAN_REVIEW") {
      return this.generate(courseId)
    }
    return approved
  },

  async generate(courseId, lab) {
    return normalizeCourse(await request(`/courses/${courseId}/lab/generate`, { method: "POST", body: lab || {} }))
  },

  async regenerate(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/lab/regenerate`, { method: "POST", body: {} }))
  },

  async approve(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/lab/approve`, { method: "POST", body: {} }))
  },

  async generateGuide(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/lab-guide/generate`, { method: "POST", body: {} }))
  },

  async approveGuidePlan(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/lab-guide/plan/approve`, { method: "POST", body: {} }))
  },

  async regenerateGuidePlan(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/lab-guide/plan/regenerate`, { method: "POST", body: {} }))
  },

  async regenerateGuide(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/lab-guide/regenerate`, { method: "POST", body: {} }))
  },
}
