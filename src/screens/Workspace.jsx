import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import Button from "../components/Button"
import StatusBanner from "../components/StatusBanner"
import CourseBrief from "./CourseBrief"
import PptAgent from "./PptAgent"
import LabGeneration from "./LabGeneration"
import LabGuide from "./LabGuide"
import { STEPS } from "../data"
import { courseService } from "../api/courseService"
import { workflowService } from "../api/workflowService"
import { pptService } from "../api/pptService"
import { labService } from "../api/labService"
import { fileService, findPptArtifact } from "../api/fileService"
import { messageFromError } from "../api/errors"
import { useAuth } from "../auth/context"
import { useCourse } from "../hooks/useCourse"
import { downloadBlob } from "../lib/download"
import {
  WORKFLOW,
  isGenerating,
  maxStepForStatus,
  screenForStatus,
} from "../workflow/states"

const EMPTY_BRIEF = {
  title: "",
  audience: "",
  level: "Intermediate",
  duration: "90 minutes",
  objectives: "",
  topics: "",
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
  const { course, loading, busy, error, run, refresh } = useCourse(courseId)

  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [brief, setBrief] = useState(EMPTY_BRIEF)
  const [lab, setLab] = useState(EMPTY_LAB)
  const [slideIndex, setSlideIndex] = useState(0)
  const [guideSection, setGuideSection] = useState("overview")
  const [toast, setToast] = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!course) {
      setStep(0)
      setMaxStep(0)
      return
    }
    const nextStep = screenForStatus(course.status, course.failedScreen)
    setStep(nextStep)
    setMaxStep(Math.max(nextStep, maxStepForStatus(course.status, course.failedScreen)))
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
    setSlideIndex(0)
    if (course.guide?.sections?.[0]?.id) setGuideSection(course.guide.sections[0].id)
  }, [course?.id, course?.status, course?.updatedAt])

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(""), 2200)
  }

  async function handleGeneratePlan() {
    try {
      await run(async () => {
        if (!courseId) {
          const created = await courseService.create(brief)
          const started = await workflowService.generatePlan(created.id)
          navigate(`/courses/${created.id}`, { replace: true })
          return started
        }
        await courseService.update(courseId, brief)
        return workflowService.generatePlan(courseId)
      })
    } catch (err) {
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
      await run(() => workflowService.regeneratePlan(course.id))
    } catch (err) {
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

  async function handleExport() {
    try {
      await fileService.downloadAll(course)
    } catch (err) {
      showToast(messageFromError(err, "Download all failed."))
    }
  }

  const current = STEPS[step] || STEPS[0]
  const status = course?.status || WORKFLOW.SELECT_COURSE
  const generating = isGenerating(status)
  const failed = status === WORKFLOW.FAILED
  const errorMessage = messageFromError(error, "")
  const ppt = findPptArtifact(course)

  return (
    <div className="app">
      <Sidebar step={step} maxStep={maxStep} onSelect={setStep} course={course} />
      <div className="workspace">
        <Header title={current.header} subtitle={current.subtitle} />
        <main className="content">
          {loading ? (
            <section className="brief">
              <StatusBanner tone="busy" title="Loading course" message="Restoring the latest backend status." />
            </section>
          ) : null}

          {!loading && error && !course && courseId ? (
            <section className="brief">
              <StatusBanner
                tone="error"
                title="Couldn’t open this course"
                message={errorMessage}
                action={
                  <Button variant="secondary" onClick={() => refresh()}>
                    Retry
                  </Button>
                }
              />
            </section>
          ) : null}

          {!loading && step === 0 ? (
            <CourseBrief
              brief={brief}
              onChange={(key, value) => setBrief((prev) => ({ ...prev, [key]: value }))}
              onGenerate={handleGeneratePlan}
              busy={busy}
              error={errorMessage}
              readOnly={Boolean(course) && status !== WORKFLOW.SELECT_COURSE && status !== WORKFLOW.FAILED}
              canGenerate={can("plan:generate") && (!course || status === WORKFLOW.SELECT_COURSE || status === WORKFLOW.FAILED)}
            />
          ) : null}

          {!loading && step === 1 ? (
            <PptAgent
              course={course}
              slides={course?.plan?.slides || []}
              slideIndex={slideIndex}
              onSelectSlide={setSlideIndex}
              onRegenerate={handleRegeneratePlan}
              onRegenerateSlides={handleRegenerateSlides}
              onApprove={handleApprovePlan}
              onDownloadPpt={handleDownloadPpt}
              onStartLab={handleStartLab}
              busy={busy}
              downloading={downloading}
              generating={generating && (status === WORKFLOW.PLAN_GENERATING || status === WORKFLOW.PPT_GENERATING || status === WORKFLOW.REGENERATE)}
              failed={failed}
              error={errorMessage || course?.error}
              canApprove={can("plan:approve") && (status === WORKFLOW.PLAN_REVIEW || status === WORKFLOW.WAITING_FOR_APPROVAL)}
              canRegenerate={
                can("plan:regenerate") || can("ppt:regenerate")
                  ? status === WORKFLOW.PLAN_REVIEW ||
                    status === WORKFLOW.WAITING_FOR_APPROVAL ||
                    status === WORKFLOW.PPT_READY ||
                    failed
                  : false
              }
              canDownloadPpt={can("ppt:download") && (status === WORKFLOW.PPT_READY || Boolean(ppt))}
              canStartLab={can("lab:generate") && status === WORKFLOW.PPT_READY}
              ppt={ppt}
              summary={course?.plan?.summary}
            />
          ) : null}

          {!loading && step === 2 ? (
            <LabGeneration
              lab={lab}
              tasks={course?.lab?.tasks || []}
              criteria={course?.lab?.criteria || []}
              onChange={(key, value) => setLab((prev) => ({ ...prev, [key]: value }))}
              onBack={() => setStep(1)}
              onGenerate={handleGenerateGuide}
              onRegenerate={handleRegenerateLab}
              busy={busy}
              generating={status === WORKFLOW.LAB_GENERATING}
              failed={failed}
              error={errorMessage || course?.error}
              canGenerate={can("lab:approve") && status === WORKFLOW.LAB_REVIEW}
              canRegenerate={can("lab:regenerate") && (status === WORKFLOW.LAB_REVIEW || failed)}
            />
          ) : null}

          {!loading && step === 3 ? (
            <LabGuide
              section={guideSection}
              onSelectSection={setGuideSection}
              guide={course?.guide}
              artifacts={course?.artifacts || []}
              onDownload={handleDownload}
              onExport={handleExport}
              generating={status === WORKFLOW.LAB_GUIDE_GENERATING}
              failed={failed}
              error={errorMessage || course?.error}
              canDownload={can("artifacts:download") && status === WORKFLOW.COMPLETE}
            />
          ) : null}
        </main>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
