import { request } from "./client"

export const categoryService = {
  async list() {
    return request("/categories")
  },

  async create(name) {
    return request("/categories", { method: "POST", body: { name } })
  },

  async update(id, name) {
    return request(`/categories/${id}`, { method: "PUT", body: { name } })
  },

  async remove(id) {
    return request(`/categories/${id}`, { method: "DELETE" })
  },
}
