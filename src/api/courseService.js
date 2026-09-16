import { request } from "./client"
import { normalizeCourse, normalizeCourseList } from "./normalize"

export const courseService = {
  async list() {
    return normalizeCourseList(await request("/courses"))
  },

  async get(id) {
    return normalizeCourse(await request(`/courses/${id}`))
  },

  async create(input) {
    return normalizeCourse(await request("/courses", { method: "POST", body: input }))
  },

  async update(id, input) {
    return normalizeCourse(await request(`/courses/${id}`, { method: "PATCH", body: input }))
  },

  async remove(id) {
    return request(`/courses/${id}`, { method: "DELETE" })
  },
}
