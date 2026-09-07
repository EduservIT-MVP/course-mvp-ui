import { SLIDES, LAB_TASKS, CRITERIA, GUIDE_PAGES, GUIDE_SECTIONS } from "../data"
import { WORKFLOW } from "../workflow/states"

function splitList(text) {
  return String(text || "")
    .split(/[;,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildPlan(brief) {
  const topics = splitList(brief.topics)
  const slides = (topics.length ? topics : SLIDES.map((slide) => slide.title)).map((topic, index) => {
    const seed = SLIDES[index % SLIDES.length]
    return {
      id: index + 1,
      title: topic,
      kicker: `${String(index + 1).padStart(2, "0")} · ${brief.level || "COURSE"}`.toUpperCase(),
      heading: seed.heading,
      body: `${seed.body} This module is for ${brief.audience || "learners"}.`,
      notes: `${seed.notes} Objective: ${brief.objectives || "Define the teaching goal."}`,
    }
  })

  return {
    summary: `${brief.title} · ${brief.duration || "flexible"} · ${brief.level || "mixed"}`,
    sections: Math.max(1, Math.ceil(slides.length / 2)),
    slides,
  }
}

export function buildLab(brief, lab) {
  const criteria = splitList(brief.objectives)
  return {
    scenario: lab?.scenario || `${brief.title} workshop`,
    environment: lab?.environment || "Browser workspace",
    assets: lab?.assets || "Starter notes, template, evaluation rubric",
    tasks: LAB_TASKS,
    criteria: criteria.length ? criteria : CRITERIA,
    code: {
      language: "javascript",
      files: [
        {
          path: "lab/agent.js",
          content: `// Lab starter generated for ${brief.title}\nexport const goal = ${JSON.stringify(brief.objectives || "")}\n`,
        },
      ],
    },
  }
}

export function buildGuide(brief, lab) {
  const sections = GUIDE_SECTIONS.map((section) => {
    const page = GUIDE_PAGES[section.id]
    return {
      id: section.id,
      label: section.label,
      kicker: page.kicker,
      title: page.title,
      lede: `${page.lede} Scenario: ${lab?.scenario || brief.title}.`,
    }
  })

  return {
    title: brief.title,
    outcomes: splitList(brief.objectives).slice(0, 3),
    sections,
  }
}

export function buildArtifacts(course) {
  const slug = (course.title || "course").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return [
    {
      id: "ppt",
      type: "ppt",
      name: `${slug}-theory.pptx`,
      label: "Theory / course deck",
      sizeLabel: `${course.plan?.slides?.length || 0} slides`,
    },
    {
      id: "lab-code",
      type: "lab-code",
      name: `${slug}-lab.js`,
      label: "Lab code",
      sizeLabel: "Starter workspace",
    },
    {
      id: "lab-guide",
      type: "lab-guide",
      name: `${slug}-guide.json`,
      label: "Lab guide",
      sizeLabel: `${course.guide?.sections?.length || 0} sections`,
    },
  ]
}

export function artifactBlob(course, artifact) {
  if (artifact.type === "ppt") {
    return new Blob([JSON.stringify(course.plan, null, 2)], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
  }
  if (artifact.type === "lab-code") {
    const content = course.lab?.code?.files?.map((file) => `// ${file.path}\n${file.content}`).join("\n") || ""
    return new Blob([content], { type: "text/javascript" })
  }
  return new Blob([JSON.stringify(course.guide, null, 2)], { type: "application/json" })
}

export function nextAfterGenerate(status) {
  switch (status) {
    case WORKFLOW.PLAN_GENERATING:
      return WORKFLOW.PLAN_REVIEW
    case WORKFLOW.PPT_GENERATING:
    case WORKFLOW.REGENERATE:
      return WORKFLOW.PPT_READY
    case WORKFLOW.LAB_GENERATING:
      return WORKFLOW.LAB_REVIEW
    case WORKFLOW.LAB_GUIDE_GENERATING:
      return WORKFLOW.COMPLETE
    default:
      return status
  }
}
