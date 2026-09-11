import { LAB_TASKS, CRITERIA, GUIDE_PAGES, GUIDE_SECTIONS } from "../data"
import { WORKFLOW } from "../workflow/states"

function splitList(text) {
  return String(text || "")
    .split(/[;,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildPlan(brief) {
  const topic =
    splitList(brief.topics)[0] ||
    String(brief.title || "this topic").trim() ||
    "this topic"
  const title = String(brief.title || topic).trim() || "Course"
  const audience = brief.audience || "practitioners"
  const level = brief.level || "Intermediate"
  const objectives = splitList(brief.objectives)
  const objLine = objectives[0] || `Explain and apply ${topic} in a real workflow`
  const relatedTopics = splitList(brief.topics).slice(1, 4)
  const related = relatedTopics.length ? relatedTopics.join(", ") : `related controls around ${topic}`

  const sections = [
    {
      title: "Core Concept",
      bullets: [
        `${topic} is the core idea this course teaches for ${audience}.`,
        `Learners should leave able to: ${objLine}.`,
        "Keep the definition short, precise, and free of vendor jargon.",
        "Anchor every later slide back to this definition.",
      ],
    },
    {
      title: "Comparison",
      bullets: [
        `Contrast ${topic} with the default approach teams use today.`,
        `Call out when ${topic} is the better fit, and when it is not.`,
        `Highlight one trade-off (security, UX, or operations) ${audience} will feel.`,
        `Map ${topic} against ${related}.`,
      ],
    },
    {
      title: "Real-World Example",
      bullets: [
        `Walk through a concrete ${String(level).toLowerCase()} scenario using ${topic}.`,
        `Show the before state (pain) and after state (with ${topic}).`,
        "Name the roles involved and the decision each role owns.",
        "Capture one failure mode teams actually hit in production.",
      ],
    },
    {
      title: "Best Practices",
      bullets: [
        `Start with a narrow scope before expanding ${topic}.`,
        "Prefer explicit contracts and checkable outcomes over vague guidance.",
        "Document assumptions so the lab can validate them.",
        `Review ${topic} decisions against the course objectives.`,
      ],
    },
    {
      title: "Flow",
      bullets: [
        `Introduce the goal → define ${topic} → compare options → apply in a scenario.`,
        "Sequence slides so each step unlocks the next decision.",
        "Reserve time for questions before the hands-on lab.",
        "End the flow with a short “what good looks like” checklist.",
      ],
    },
    {
      title: "Remember This",
      bullets: [
        `${topic} matters because ${audience} must make better decisions under pressure.`,
        `One crisp takeaway: apply ${topic} deliberately, then verify with evidence.`,
        "Point learners to the lab for practice, not more slides.",
        "Revisit this slide if discussion drifts into tooling details.",
      ],
    },
  ]

  const slides = sections.map((section, index) => ({
    id: index + 1,
    title: section.title,
    kicker: `${String(index + 1).padStart(2, "0")} · ${String(level).toUpperCase()}`,
    heading: section.title,
    body: section.bullets.map((line) => `• ${line}`).join("\n"),
    notes: `Facilitator note: cover “${section.title}” with a concrete example.`,
  }))

  return {
    summary: `${title} · ${brief.duration || "flexible"} · ${level} · ${slides.length} slides`,
    sections: slides.length,
    slides,
  }
}

export function buildLab(brief, lab) {
  const fromObjectives = splitList(brief.objectives)
  const criteria =
    fromObjectives.length >= 2 || (fromObjectives.length === 1 && fromObjectives[0].length > 28)
      ? fromObjectives
      : CRITERIA
  const scenario = lab?.scenario || brief.title || "Hands-on lab"
  return {
    scenario,
    environment: lab?.environment || "Browser workspace",
    assets: lab?.assets || "Starter notes, template, evaluation rubric",
    tasks: LAB_TASKS,
    criteria,
    useCase: lab?.scenario || `Apply ${brief.title || "course"} concepts in a guided hands-on exercise.`,
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
