export const DEMO_PASSWORD = "CourseForge123!"

export const DEMO_USERS = [
  {
    email: "instructor@eduservit.local",
    password: DEMO_PASSWORD,
    role: "instructor",
    name: "Maya Chen",
  },
  {
    email: "admin@eduservit.local",
    password: DEMO_PASSWORD,
    role: "admin",
    name: "Admin",
  },
  {
    email: "reviewer@eduservit.local",
    password: DEMO_PASSWORD,
    role: "reviewer",
    name: "Reviewer",
  },
  {
    email: "learner@eduservit.local",
    password: DEMO_PASSWORD,
    role: "learner",
    name: "Learner",
  },
]

export function findDemoUser(email, password) {
  const normalized = String(email || "").trim().toLowerCase()
  return DEMO_USERS.find((user) => user.email === normalized && user.password === password)
}
