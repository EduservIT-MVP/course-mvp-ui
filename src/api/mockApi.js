import { AuthError, ForbiddenError, ApiError } from "./errors"
import { can } from "../auth/permissions"
import { findDemoUser } from "../auth/demoUsers"
import { WORKFLOW, isGenerating } from "../workflow/states"
import { artifactBlob, buildArtifacts, buildGuide, buildLab, buildPlan, nextAfterGenerate } from "./mockGenerators"
import { buildPptxBlob } from "../lib/buildPptx"

const KEY = "eduservit.mock.db"

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { courses: [] }
  } catch {
    return { courses: [] }
  }
}

function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

function now() {
  return new Date().toISOString()
}

function requireUser(user) {
  if (!user) throw new AuthError()
  return user
}

function requirePermission(user, permission) {
  requireUser(user)
  if (!can(user, permission)) throw new ForbiddenError()
}

function requireCourse(id) {
  const db = load()
  const course = db.courses.find((item) => item.id === id)
  if (!course) throw new ApiError("Course not found.", { status: 404, code: "not_found" })
  return { db, course }
}

function commit(db, course) {
  const index = db.courses.findIndex((item) => item.id === course.id)
  const next = { ...course, updatedAt: now() }
  if (index >= 0) db.courses[index] = next
  else db.courses.unshift(next)
  save(db)
  return next
}

function advanceIfGenerating(course) {
  if (!isGenerating(course.status)) return course
  const status = nextAfterGenerate(course.status)
  const next = { ...course, status, error: null }

    if (status === WORKFLOW.PLAN_REVIEW) {
      next.plan = buildPlan(course)
      next.status = WORKFLOW.WAITING_FOR_APPROVAL
    }
    if (status === WORKFLOW.PPT_READY) {
      next.plan = next.plan || buildPlan(course)
      const ppt = buildArtifacts(next).find((item) => item.type === "ppt")
      next.artifacts = [ppt]
      next.ppt = ppt
    }
  if (course.status === WORKFLOW.LAB_GENERATING && status === WORKFLOW.LAB_REVIEW) {
    next.lab = buildLab(course, course.lab)
  }
  if (status === WORKFLOW.COMPLETE) {
    next.guide = buildGuide(course, course.lab)
    next.artifacts = buildArtifacts({ ...next, guide: next.guide })
  }
  return next
}

export const mockApi = {
  login({ email, password }) {
    const demo = findDemoUser(email, password)
    if (demo) {
      return {
        token: `mock-token-${demo.email}`,
        user: { id: `user-${demo.email}`, email: demo.email, name: demo.name, role: demo.role },
      }
    }
    if (!email || !password) {
      throw new ApiError("Email and password are required.", { status: 400, code: "validation" })
    }
    const name = String(email.split("@")[0] || "User").replace(/[._]/g, " ")
    const user = {
      id: `user-${String(email).toLowerCase()}`,
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      role: "instructor",
    }
    return { token: `mock-token-${user.id}`, user }
  },

  logout() {
    return { ok: true }
  },

  me(user) {
    return { user: requireUser(user) }
  },

  listCourses(user) {
    requirePermission(user, "course:list")
    return load().courses
  },

  getCourse(user, id) {
    requirePermission(user, "course:view")
    const { db, course } = requireCourse(id)
    if (!isGenerating(course.status)) return course
    return commit(db, advanceIfGenerating(course))
  },

  createCourse(user, input) {
    requirePermission(user, "course:create")
    const course = {
      id: crypto.randomUUID(),
      status: WORKFLOW.SELECT_COURSE,
      title: input.title || "Untitled course",
      audience: input.audience || "",
      level: input.level || "Intermediate",
      duration: input.duration || "90 minutes",
      objectives: input.objectives || "",
      topics: input.topics || "",
      lab: {
        scenario: input.lab?.scenario || "",
        environment: input.lab?.environment || "Browser workspace",
        assets: input.lab?.assets || "",
      },
      plan: null,
      guide: null,
      artifacts: [],
      error: null,
      failedScreen: 0,
      createdBy: user.id,
      createdAt: now(),
      updatedAt: now(),
    }
    const db = load()
    return commit(db, course)
  },

  updateCourse(user, id, input) {
    requirePermission(user, "course:update")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, ...input, lab: { ...course.lab, ...input.lab } })
  },

  generatePlan(user, id) {
    requirePermission(user, "plan:generate")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.PLAN_GENERATING, error: null, failedScreen: 1 })
  },

  regeneratePlan(user, id) {
    requirePermission(user, "plan:regenerate")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.PLAN_GENERATING, error: null, failedScreen: 1 })
  },

  approvePlan(user, id) {
    requirePermission(user, "plan:approve")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.PPT_GENERATING, error: null, failedScreen: 1 })
  },

  generatePpt(user, id) {
    requirePermission(user, "ppt:generate")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.PPT_GENERATING, error: null, failedScreen: 1 })
  },

  regeneratePpt(user, id) {
    requirePermission(user, "ppt:regenerate")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.PPT_GENERATING, error: null, failedScreen: 1 })
  },

  generateLab(user, id, lab) {
    requirePermission(user, "lab:generate")
    const { db, course } = requireCourse(id)
    return commit(db, {
      ...course,
      lab: { ...course.lab, ...lab },
      status: WORKFLOW.LAB_GENERATING,
      error: null,
      failedScreen: 2,
    })
  },

  regenerateLab(user, id) {
    requirePermission(user, "lab:regenerate")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.LAB_GENERATING, error: null, failedScreen: 2 })
  },

  approveLab(user, id) {
    requirePermission(user, "lab:approve")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.LAB_GUIDE_GENERATING, error: null, failedScreen: 3 })
  },

  generateGuide(user, id) {
    requirePermission(user, "guide:generate")
    const { db, course } = requireCourse(id)
    return commit(db, { ...course, status: WORKFLOW.LAB_GUIDE_GENERATING, error: null, failedScreen: 3 })
  },

  listArtifacts(user, id) {
    requirePermission(user, "artifacts:download")
    const { course } = requireCourse(id)
    return course.artifacts || []
  },

  async downloadArtifact(user, id, artifactId) {
    requirePermission(user, "artifacts:download")
    const { course } = requireCourse(id)
    const artifact = (course.artifacts || []).find((item) => item.id === artifactId)
    if (!artifact) throw new ApiError("File not found.", { status: 404, code: "not_found" })
    if (artifact.type === "ppt") {
      return { blob: await buildPptxBlob(course), filename: artifact.name }
    }
    return { blob: artifactBlob(course, artifact), filename: artifact.name }
  },

  regenerateSlides(user, id, { slides = [], prompt, notes }) {
    requirePermission(user, "ppt:regenerate")
    const { db, course } = requireCourse(id)
    const nextSlides = [...(course.plan?.slides || [])]
    const targets = slides.length ? slides : []
    for (const target of targets) {
      const at = nextSlides.findIndex(
        (item, index) => String(item.id) === String(target.id) || index === Number(target.index),
      )
      if (at < 0) continue
      nextSlides[at] = {
        ...nextSlides[at],
        notes: notes || prompt || nextSlides[at].notes,
        body: prompt || nextSlides[at].body,
      }
    }
    return commit(db, {
      ...course,
      plan: { ...course.plan, slides: nextSlides },
      status: WORKFLOW.PPT_READY,
      updatedAt: new Date().toISOString(),
    })
  },
}
