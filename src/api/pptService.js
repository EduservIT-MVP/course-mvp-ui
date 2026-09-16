import { request } from "./client"
import { normalizeCourse } from "./normalize"

export const pptService = {
  async generate(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/ppt/generate`, { method: "POST", body: {} }))
  },

  async regenerate(courseId) {
    return normalizeCourse(await request(`/courses/${courseId}/ppt/regenerate`, { method: "POST", body: {} }))
  },

  async regenerateSlides(courseId, payload) {
    const body = {
      slides: payload.slides || [],
      prompt: payload.prompt || "",
      notes: payload.notes || payload.prompt || "",
    }
    return normalizeCourse(
      await request(`/courses/${courseId}/ppt/slides/regenerate`, { method: "POST", body }),
    )
  },
}
