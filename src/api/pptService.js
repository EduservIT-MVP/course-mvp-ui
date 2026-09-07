import { request } from "./client"
import { isMockMode } from "./config"
import { mockApi } from "./mockApi"
import { normalizeCourse } from "./normalize"
import { readSession } from "./session"

function user() {
  return readSession()?.user ?? null
}

export const pptService = {
  async generate(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.generatePpt(user(), courseId))
    return normalizeCourse(await request(`/courses/${courseId}/ppt/generate`, { method: "POST", body: {} }))
  },

  async regenerate(courseId) {
    if (isMockMode()) return normalizeCourse(mockApi.regeneratePpt(user(), courseId))
    return normalizeCourse(await request(`/courses/${courseId}/ppt/regenerate`, { method: "POST", body: {} }))
  },

  async regenerateSlides(courseId, payload) {
    const body = {
      slides: payload.slides || [],
      prompt: payload.prompt || "",
      notes: payload.notes || payload.prompt || "",
    }
    if (isMockMode()) return normalizeCourse(mockApi.regenerateSlides(user(), courseId, body))
    return normalizeCourse(
      await request(`/courses/${courseId}/ppt/slides/regenerate`, { method: "POST", body }),
    )
  },
}
