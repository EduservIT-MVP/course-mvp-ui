import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import Button from "../components/Button"
import ConfirmDialog from "../components/ConfirmDialog"
import StatusBanner from "../components/StatusBanner"
import CourseBrief from "./CourseBrief"
import PlanGeneratingScreen from "./PlanGeneratingScreen"
import PlanReviewScreen from "./PlanReviewScreen"
import PptGeneratingScreen from "./PptGeneratingScreen"
import PptAgent from "./PptAgent"
import LabGeneration from "./LabGeneration"
import LabGuide from "./LabGuide"
import CourseOverview from "./CourseOverview"
import { courseService } from "../api/courseService"
import { workflowService } from "../api/workflowService"
import { pptService } from "../api/pptService"
import { labService } from "../api/labService"
import { fileService, findPptArtifact } from "../api/fileService"
import { messageFromError } from "../api/errors"
import { useAuth } from "../auth/context"
import { useCourse } from "../hooks/useCourse"
import { downloadBlob } from "../lib/download"
import { WORKFLOW } from "../workflow/states"
import WorkflowRouter from "../workflow/WorkflowRouter"
import {
  SCREEN,
  headerMetaForScreen,
  resolveWorkflowScreen,
  sidebarStepForCourse,
} from "../workflow/screens"
import { maxStepForStatus } from "../workflow/states"

const EMPTY_BRIEF = {
  title: "",
  audience: "",
  level: "Intermediate",
  duration: "90 minutes",
  objectives: "",
  topics: "",
  category: "",
}

const EMPTY_LAB = {
  scenario: "",
  environment: "Browser workspace",
  assets: "",
}

export default function Workspace() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { course, setCourse, loading, busy, error, run, refresh } = useCourse(courseId)
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get("category") || ""

  // Form drafts only — never used to pick which workflow screen to show.
  const [brief, setBrief] = useState({ ...EMPTY_BRIEF, category: initialCategory })
  const [lab, setLab] = useState(EMPTY_LAB)
  const [slideIndex, setSlideIndex] = useState(0)
  const [guideSection, setGuideSection] = useState("overview")
  const [toast, setToast] = useState("")
  const [downloading, setDownloading] = useState(false)
  // Leave the brief immediately on submit, even before navigate/refetch finishes.
  const [awaitingPlan, setAwaitingPlan] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeStep, setActiveStep] = useState(null)

  const status = awaitingPlan
    ? WORKFLOW.PLAN_GENERATING
    : course?.status || WORKFLOW.SELECT_COURSE
  const failed = status === WORKFLOW.FAILED
  const ppt = findPptArtifact(course)
  const displayStatus = status
  const screen = resolveWorkflowScreen(displayStatus)
  const serverStep = awaitingPlan ? 1 : sidebarStepForCourse(course)
  const step = activeStep !== null ? activeStep : serverStep
  const maxStep = maxStepForStatus(status, Number(course?.failedScreen)) || serverStep
  const header = headerMetaForScreen(screen)
  const errorMessage = messageFromError(error, "")

  const prevStatusRef = useRef(null)

  useEffect(() => {
    if (!courseId) setSlideIndex(0)
  }, [courseId])

  useEffect(() => {
    const next = course?.status || null
    const prev = prevStatusRef.current
    prevStatusRef.current = next
    // Reset slide only when entering Presentation from generating — not on every course refresh.
    if (next === WORKFLOW.PPT_READY && prev && prev !== WORKFLOW.PPT_READY) {
      setSlideIndex(0)
    }
  }, [course?.status])

  useEffect(() => {
    if (!course) {
      if (!awaitingPlan) {
        setBrief({ ...EMPTY_BRIEF, category: initialCategory })
        setLab(EMPTY_LAB)
      }
      return
    }
    // Agent finished (or failed) — stop the optimistic "waiting" override.
    if (course.status && course.status !== WORKFLOW.PLAN_GENERATING) {
      setAwaitingPlan(false)
    }
    setBrief({
      title: course.title || "",
      audience: course.audience || "",
      level: course.level || "Intermediate",
      duration: course.duration || "90 minutes",
      objectives: course.objectives || "",
      topics: course.topics || "",
    })
    setLab({
      scenario: course.lab?.scenario || "",
      environment: course.lab?.environment || "Browser workspace",
      assets: course.lab?.assets || "",
    })
    if (course.guide?.sections?.[0]?.id) setGuideSection(course.guide.sections[0].id)
  }, [course?.id, course?.status, course?.updatedAt, awaitingPlan])

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(""), 2200)
  }

  async function handleGeneratePlan() {
    // Spec: after brief submit, leave the form and wait for the agent.
    setAwaitingPlan(true)
    try {
      await run(async () => {
        if (!courseId) {
          const created = await courseService.create(brief)
          const started = await workflowService.generatePlan(created.id)
          setCourse(started)
          navigate(`/courses/${created.id}`, { replace: true })
          return started
        }
        await courseService.update(courseId, brief)
        return workflowService.generatePlan(courseId)
      })
    } catch (err) {
      setAwaitingPlan(false)
      showToast(messageFromError(err, "Could not start plan generation."))
    }
  }

  async function handleRegenerateSlides({ slides, prompt, notes }) {
    try {
      await run(() => pptService.regenerateSlides(course.id, { slides, prompt, notes }))
      showToast("Slide regeneration requested.")
    } catch (err) {
      showToast(messageFromError(err, "Could not regenerate the tagged slide."))
    }
  }

  async function handleRegeneratePlan() {
    try {
      if (course?.status === WORKFLOW.PPT_READY || course?.status === WORKFLOW.PPT_GENERATING) {
        await run(() => pptService.regenerate(course.id))
        return
      }
      setAwaitingPlan(true)
      await run(() => workflowService.regeneratePlan(course.id))
    } catch (err) {
      setAwaitingPlan(false)
      showToast(messageFromError(err, "Could not regenerate."))
    }
  }

  async function handleApprovePlan() {
    try {
      await run(() => workflowService.approvePlan(course.id))
    } catch (err) {
      showToast(messageFromError(err, "Could not approve the plan."))
    }
  }

  async function handleStartLab() {
    try {
      await run(() => labService.generate(course.id, lab))
    } catch (err) {
      showToast(messageFromError(err, "Could not start lab generation."))
    }
  }

  async function handleGenerateGuide() {
    try {
      await run(async () => {
        if (can("course:update")) await courseService.update(course.id, { lab })
        return labService.approve(course.id)
      })
    } catch (err) {
      showToast(messageFromError(err, "Could not generate the lab guide."))
    }
  }

  async function handleRegenerateLab() {
    try {
      await run(() => labService.regenerate(course.id))
    } catch (err) {
      showToast(messageFromError(err, "Could not regenerate the lab."))
    }
  }

  async function handleDownloadPpt() {
    setDownloading(true)
    try {
      await fileService.downloadPpt(course)
    } catch (err) {
      showToast(messageFromError(err, "PPT download failed."))
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownload(file) {
    try {
      const { blob, filename } = await fileService.download(course.id, file)
      await downloadBlob(blob, filename)
    } catch (err) {
      showToast(messageFromError(err, "Download failed."))
    }
  }

  async function handleDeleteCourse() {
    if (!course?.id) return
    setDeleting(true)
    try {
      await courseService.remove(course.id)
      setConfirmDeleteOpen(false)
      navigate("/", { replace: true })
    } catch (err) {
      showToast(messageFromError(err, "Could not delete the course."))
      setConfirmDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleExport() {
    try {
      await fileService.downloadAll(course)
    } catch (err) {
      showToast(messageFromError(err, "Download all failed."))
    }
  }

  async function handleDownloadSection(sourceAgent) {
    try {
      await fileService.downloadSection(course, sourceAgent)
    } catch (err) {
      showToast(messageFromError(err, "Download section failed."))
    }
  }

  const briefNode = (
    <CourseBrief
      brief={brief}
      onChange={(key, value) => setBrief((prev) => ({ ...prev, [key]: value }))}
      onGenerate={handleGeneratePlan}
      busy={busy || awaitingPlan}
      error={errorMessage}
      readOnly={Boolean(course) && status !== WORKFLOW.SELECT_COURSE && status !== WORKFLOW.FAILED}
      canGenerate={
        can("plan:generate") &&
        (!course || status === WORKFLOW.SELECT_COURSE || status === WORKFLOW.FAILED) &&
        !awaitingPlan
      }
    />
  )

  const planGeneratingNode = <PlanGeneratingScreen course={course || { title: brief.title }} />

  // Dedicated plan approval — uses course.plan.slides from the backend agent, not the PPT file.
  const planReviewNode = (
    <PlanReviewScreen
      course={course}
      busy={busy}
      canApprove={
        can("plan:approve") &&
        (status === WORKFLOW.PLAN_REVIEW || status === WORKFLOW.WAITING_FOR_APPROVAL)
      }
      canRegenerate={
        can("plan:regenerate") &&
        (status === WORKFLOW.PLAN_REVIEW || status === WORKFLOW.WAITING_FOR_APPROVAL || failed)
      }
      onApprove={handleApprovePlan}
      onRegenerate={handleRegeneratePlan}
      error={errorMessage || course?.error}
    />
  )

  const pptGeneratingNode = <PptGeneratingScreen course={course} />

  // PPT ready only — no plan Approve here (that lives on PlanReviewScreen).
  const pptNode = (
    <PptAgent
      course={course}
      slideIndex={slideIndex}
      onSelectSlide={setSlideIndex}
      onRegenerate={handleRegeneratePlan}
      onRegenerateSlides={handleRegenerateSlides}
      onApprove={undefined}
      onDownloadPpt={handleDownloadPpt}
      onStartLab={handleStartLab}
      busy={busy}
      downloading={downloading}
      generating={false}
      failed={failed}
      error={errorMessage || course?.error}
      canApprove={false}
      canRegenerate={
        can("ppt:regenerate") && (status === WORKFLOW.PPT_READY || failed)
      }
      canDownloadPpt={can("ppt:download") && Boolean(ppt)}
      canStartLab={can("lab:generate") && status === WORKFLOW.PPT_READY && Boolean(ppt)}
      ppt={ppt}
      summary={course?.plan?.summary}
    />
  )

  const labNode = (
    <LabGeneration
      lab={course?.lab}
      busy={busy}
      generating={status === WORKFLOW.LAB_GENERATING}
      failed={failed}
      error={errorMessage || course?.error}
    />
  )

  const guideNode = (
    <LabGuide
      lab={course?.lab}
      guide={course?.guide}
      onApprove={handleGenerateGuide}
      onRegenerate={handleRegenerateLab}
      generating={status === WORKFLOW.LAB_GUIDE_GENERATING}
      busy={busy}
      failed={failed}
      error={errorMessage || course?.error}
      canApprove={can("lab:approve") && status === WORKFLOW.LAB_REVIEW}
      canRegenerate={can("lab:regenerate") && (status === WORKFLOW.LAB_REVIEW || failed)}
      section={guideSection}
      onSelectSection={setGuideSection}
    />
  )

  const overviewNode = (
    <CourseOverview
      course={course}
      artifacts={course?.artifacts || []}
      onDownload={handleDownload}
      onDownloadSection={handleDownloadSection}
      onExport={handleExport}
      loading={loading}
      error={errorMessage || course?.error}
      canDownload={can("artifacts:download") && status === WORKFLOW.COMPLETE}
    />
  )

  // WorkflowRouter reads course.status; while awaitingPlan we pass a stub generating status.
  const routedCourse = awaitingPlan
    ? { ...(course || {}), status: WORKFLOW.PLAN_GENERATING, title: course?.title || brief.title }
    : course

  return (
    <div className="app">
      <Sidebar
        step={step}
        maxStep={maxStep}
        onSelect={(idx) => {
          if (idx <= maxStep) setActiveStep(idx)
        }}
        course={routedCourse}
      />
      <div className="workspace">
        <Header
          title={header.header}
          subtitle={header.subtitle || undefined}
          course={course}
          actions={
            course && can("course:delete") ? (
              <Button variant="secondary" size="sm" className="course-delete-btn" onClick={() => setConfirmDeleteOpen(true)}>
                Delete course
              </Button>
            ) : null
          }
        />
        <main className="content">
          {loading && !awaitingPlan && !course ? (
            <section className="brief">
              <StatusBanner tone="busy" title="Loading course" message="Restoring the latest backend status." />
            </section>
          ) : null}

          {!loading && error && !course && courseId && !awaitingPlan ? (
            <section className="brief">
              <StatusBanner
                tone="error"
                title="Couldn’t open this course"
                message={errorMessage}
                action={
                  <Button variant="secondary" size="sm" onClick={() => refresh()}>
                    Retry
                  </Button>
                }
              />
            </section>
          ) : null}

          {(!loading || awaitingPlan || course) && !(error && !course && courseId && !awaitingPlan) ? (
            <WorkflowRouter
              course={routedCourse}
              step={step}
              serverStep={serverStep}
              screens={{
                0: briefNode,
                1: ppt ? pptNode : planReviewNode,
                2: labNode,
                3: guideNode,
                4: overviewNode,
                [SCREEN.COURSE_BRIEF]: briefNode,
                [SCREEN.PLAN_GENERATING]: planGeneratingNode,
                [SCREEN.PLAN_REVIEW]: planReviewNode,
                [SCREEN.PPT_GENERATING]: pptGeneratingNode,
                [SCREEN.PPT_READY]: pptNode,
                [SCREEN.LAB_GENERATING]: labNode,
                [SCREEN.LAB_REVIEW]: guideNode,
                [SCREEN.LAB_GUIDE_ACTION]: guideNode,
                [SCREEN.LAB_GUIDE_GENERATING]: guideNode,
                [SCREEN.COMPLETE]: overviewNode,
                [SCREEN.FAILED]:
                  step === 0
                    ? briefNode
                    : step === 2
                      ? labNode
                      : step === 3
                        ? guideNode
                        : status === WORKFLOW.FAILED && Number(course?.failedScreen) === 1
                          ? planReviewNode
                          : pptNode,
              }}
            />
          ) : null}
        </main>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this course?"
        message={
          course
            ? `“${course.title || "Untitled course"}” and all of its generated files will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete course"
        cancelLabel="Keep course"
        busy={deleting}
        onCancel={() => !deleting && setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteCourse}
      />
    </div>
  )
}
