import { downloadBlob } from "../lib/download"
import { request, requestBlob } from "./client"
import { ApiError } from "./errors"
import { isPptArtifact, normalizeArtifact } from "./normalize"

export function findPptArtifact(course) {
  if (!course) return null
  if (course.ppt) return normalizeArtifact(course.ppt)
  return (course.artifacts || []).map(normalizeArtifact).find(isPptArtifact) || null
}

async function downloadFromUrl(url, fallbackName, { signed = false } = {}) {
  const result = await requestBlob(url, { auth: !signed })
  return {
    blob: result.blob,
    filename: result.filename || fallbackName || "download",
    mimeType: result.mimeType,
  }
}

export const fileService = {
  async list(courseId) {
    const payload = await request(`/courses/${courseId}/artifacts`)
    const list = Array.isArray(payload) ? payload : payload?.artifacts || payload?.files || payload?.data || []
    return list.map(normalizeArtifact)
  },

  async fetchPptBlob(courseId) {
    const result = await requestBlob(`/courses/${courseId}/ppt`)
    return result.blob
  },

  async download(courseId, artifact) {
    const file = normalizeArtifact(artifact)
    if (!file) throw new ApiError("No file metadata was returned.")

    const url = file.downloadUrl
    if (url) {
      const signed = /X-Amz-|Signature=|token=/i.test(url) || /^https?:/i.test(url)
      return downloadFromUrl(url, file.name, { signed })
    }

    const artifactId = file.id || file.fileId
    if (!artifactId) throw new ApiError("No file ID or download URL was provided.")

    return requestBlob(`/courses/${courseId}/artifacts/${artifactId}/download`)
  },

  async downloadPpt(course) {
    const ppt = findPptArtifact(course)
    if (!ppt) throw new ApiError("No PPT artifact is available yet.")
    const file = await fileService.download(course.id, ppt)
    const name = file.filename || ppt.name || "presentation.pptx"
    if (!file.blob || file.blob.size < 64) {
      throw new ApiError("PPT download returned an empty file.")
    }
    // Real PPTX is a ZIP (PK..). Reject JSON/stub payloads that were mislabeled.
    const head = new Uint8Array(await file.blob.slice(0, 2).arrayBuffer())
    if (head[0] !== 0x50 || head[1] !== 0x4b) {
      throw new ApiError("PPT artifact is not a valid .pptx file yet. Try regenerating.")
    }
    await downloadBlob(file.blob, name)
    return { ...file, filename: name }
  },

  async downloadAll(course) {
    const files = course.artifacts?.length ? course.artifacts : await fileService.list(course.id)
    if (!files.length) throw new ApiError("No generated files are available yet.")
    const downloaded = []
    for (const artifact of files) {
      const file = await fileService.download(course.id, artifact)
      await downloadBlob(file.blob, file.filename || artifact.name)
      downloaded.push(file)
    }
    return downloaded
  },
}
