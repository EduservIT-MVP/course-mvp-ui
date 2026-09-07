import { request } from "./client"
import { isMockMode } from "./config"
import { mockApi } from "./mockApi"
import { normalizeCourse, normalizeCourseList } from "./normalize"
import { readSession } from "./session"

function user() {
  return readSession()?.user ?? null
}

export const courseService = {
  async list() {
    if (isMockMode()) return normalizeCourseList(mockApi.listCourses(user()))
    return normalizeCourseList(await request("/courses"))
  },

  async get(id) {
    if (isMockMode()) return normalizeCourse(mockApi.getCourse(user(), id))
    return normalizeCourse(await request(`/courses/${id}`))
  },

  async create(input) {
    if (isMockMode()) return normalizeCourse(mockApi.createCourse(user(), input))
    return normalizeCourse(await request("/courses", { method: "POST", body: input }))
  },

  async update(id, input) {
    if (isMockMode()) return normalizeCourse(mockApi.updateCourse(user(), id, input))
    return normalizeCourse(await request(`/courses/${id}`, { method: "PATCH", body: input }))
  },
}
