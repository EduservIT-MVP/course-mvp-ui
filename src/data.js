export const STEPS = [
  { id: "brief", label: "Course brief", header: "Course brief", subtitle: "Tell the agents what you want to teach" },
  { id: "ppt", label: "PPT agent", header: "PPT agent", subtitle: "Presentation generated from your course brief" },
  { id: "lab", label: "Lab generation", header: "Lab generation agent", subtitle: "Shape the practical exercise before publishing" },
  { id: "guide", label: "Lab guide", header: "Lab guide", subtitle: "Final learner-ready materials" },
  { id: "overview", label: "Overview", header: "Course overview", subtitle: "All produced documents and artifacts" },
]

export const SLIDES = [
  {
    id: 1,
    title: "Why agent workflows now",
    kicker: "01 · CONTEXT",
    heading: "Teams need agents that finish real work, not demos.",
    body: "Product groups are drowning in research, tickets, and handoffs. A workflow is how an agent stays useful under that pressure.",
    notes: "Open with a recent product review that stalled because nobody owned the synthesis step.",
  },
  {
    id: 2,
    title: "Anatomy of an agent",
    kicker: "02 · FOUNDATIONS",
    heading: "Every useful agent has four working parts.",
    body: "A goal, the right context, a set of tools, and a loop that decides what happens next.",
    notes: "Use a familiar product example to explain how each part constrains the agent and makes its behavior easier to evaluate.",
  },
  {
    id: 3,
    title: "Context + tools",
    kicker: "03 · INPUTS",
    heading: "Give the agent only the context it can act on.",
    body: "Map each tool to one job. Interview notes, templates, and rubrics beat a dump of every document on the drive.",
    notes: "Show a bad context pack and a tight one. Ask the room which would be easier to debug.",
  },
  {
    id: 4,
    title: "Orchestration patterns",
    kicker: "04 · FLOW",
    heading: "Sequence beats a single giant prompt.",
    body: "Break the job into gather, decide, produce, and check. Hand off between steps with explicit contracts.",
    notes: "Sketch the four-step loop on a whiteboard before revealing the slide.",
  },
  {
    id: 5,
    title: "Guardrails by design",
    kicker: "05 · SAFETY",
    heading: "Constraints belong in the workflow, not after the fact.",
    body: "Scope the goal, limit tools, and refuse work the agent cannot cite from supplied sources.",
    notes: "Call out one failure mode your team has already seen in production.",
  },
  {
    id: 6,
    title: "Evaluation loop",
    kicker: "06 · QUALITY",
    heading: "Score outputs the same way every time.",
    body: "A short rubric catches weak answers faster than another round of prompting.",
    notes: "Walk through one scored example so the lab later feels familiar.",
  },
]

export const LAB_TASKS = [
  { n: 1, title: "Define the agent contract", detail: "Write a precise goal, inputs, outputs, and success criteria.", time: "15 min" },
  { n: 2, title: "Connect context and tools", detail: "Choose source materials and map each tool to one action.", time: "20 min" },
  { n: 3, title: "Run and evaluate", detail: "Test three cases and score quality against the rubric.", time: "25 min" },
]

export const CRITERIA = [
  "Agent completes the workflow without hidden assumptions",
  "Outputs cite the supplied research context",
  "Evaluation rubric catches weak or incomplete responses",
]

export const GUIDE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "begin", label: "Before you begin" },
  { id: "define", label: "Step 1 · Define" },
  { id: "connect", label: "Step 2 · Connect" },
  { id: "evaluate", label: "Step 3 · Evaluate" },
  { id: "checklist", label: "Submission checklist" },
]

export const GUIDE_PAGES = {
  overview: {
    kicker: "Hands-on lab · 60 minutes",
    title: "Build and evaluate your first agent workflow",
    lede: "You'll create a focused research synthesis agent, connect its context and tools, then test it against realistic product scenarios.",
  },
  begin: {
    kicker: "Preparation",
    title: "Before you begin",
    lede: "Download the starter workspace and open the interview-notes file. Keep the evaluation rubric nearby—you'll use it after each test run.",
  },
  define: {
    kicker: "Step 1 · 15 minutes",
    title: "Define the agent contract",
    lede: "Write a precise goal, the inputs you will provide, the output format, and three success criteria the agent must meet.",
  },
  connect: {
    kicker: "Step 2 · 20 minutes",
    title: "Connect context and tools",
    lede: "Attach only the interview notes, agent template, and rubric. Map each tool to a single action the agent is allowed to take.",
  },
  evaluate: {
    kicker: "Step 3 · 25 minutes",
    title: "Run and evaluate",
    lede: "Run three cases: a clean brief, a messy brief, and a missing-source case. Score each output with the same rubric.",
  },
  checklist: {
    kicker: "Submit",
    title: "Submission checklist",
    lede: "Include the agent contract, tool map, three scored runs, and a short note on what you would change next.",
  },
}
