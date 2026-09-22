import { request } from "./client"
import { normalizeCourse } from "./normalize"

export const labService = {
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
