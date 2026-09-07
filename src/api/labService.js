import { request } from "./client"
import { isMockMode } from "./config"
import { mockApi } from "./mockApi"
import { normalizeCourse } from "./normalize"
import { readSession } from "./session"

function user() {
  return readSession()?.user ?? null
}

export const labService = {
  async generate(courseId, lab) {
    if (isMockMode()) return normalizeCourse(mockApi.generateLab(user(), courseId, lab))
    return normalizeCourse(await request(`/courses/${courseId}/lab/generate`, { method: "POST", body: lab || {} }))
  },

  async regenerate(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.regenerateLab(user(), courseId))
    return normalizeCourse(await request(`/courses/${courseId}/lab/regenerate`, { method: "POST", body: {} }))
  },

  async approve(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.approveLab(user(), courseId))
    return normalizeCourse(await request(`/courses/${courseId}/lab/approve`, { method: "POST", body: {} }))
  },

  async generateGuide(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.generateGuide(user(), courseId))
    return normalizeCourse(await request(`/courses/${courseId}/lab-guide/generate`, { method: "POST", body: {} }))
  },
}
