import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    plugins: [react()],
    optimizeDeps: {
      // Force Vite to pre-bundle pdfjs-dist as a direct dep (was previously
      // only a transitive dep of react-pdf — stale cache causes 504 errors)
      include: ["pdfjs-dist"],
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  }
})
