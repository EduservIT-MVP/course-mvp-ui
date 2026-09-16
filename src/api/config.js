// The Flask app in this repository serves locally on port 8080. Deployments can
// override this with VITE_API_BASE_URL without changing frontend code.
export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "")
