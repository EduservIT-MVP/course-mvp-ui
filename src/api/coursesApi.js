/**
 * External REST contract used by this SPA:
 *   POST   /auth/login
 *   POST   /auth/logout
 *   GET    /auth/me
 *   GET    /courses
 *   POST   /courses
 *   GET    /courses/:id
 *   PATCH  /courses/:id
 *   POST   /courses/:id/plan/generate
 *   POST   /courses/:id/plan/regenerate
 *   POST   /courses/:id/plan/approve
 *   POST   /courses/:id/ppt/generate
 *   POST   /courses/:id/ppt/regenerate
 *   POST   /courses/:id/ppt/slides/regenerate
 *   POST   /courses/:id/lab/generate
 *   POST   /courses/:id/lab/regenerate
 *   POST   /courses/:id/lab/approve
 *   POST   /courses/:id/lab-guide/generate
 *   GET    /courses/:id/artifacts
 *   GET    /courses/:id/artifacts/:artifactId/download
 */
import { courseService } from "./courseService"
import { workflowService } from "./workflowService"
import { pptService } from "./pptService"
import { labService } from "./labService"
import { fileService } from "./fileService"

export const coursesApi = {
  ...courseService,
  generatePlan: workflowService.generatePlan,
  regeneratePlan: workflowService.regeneratePlan,
  approvePlan: workflowService.approvePlan,
  generatePpt: pptService.generate,
  regeneratePpt: pptService.regenerate,
  regenerateSlides: pptService.regenerateSlides,
  generateLab: labService.generate,
  regenerateLab: labService.regenerate,
  approveLab: labService.approve,
  generateGuide: labService.generateGuide,
  listArtifacts: fileService.list,
  downloadArtifact: (id, artifact) =>
    fileService.download(id, typeof artifact === "string" ? { id: artifact } : artifact),
}
