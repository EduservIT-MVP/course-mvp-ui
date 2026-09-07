import { useEffect, useRef } from "react"

export function usePolling(callback, intervalMs) {
  const saved = useRef(callback)

  useEffect(() => {
    saved.current = callback
  }, [callback])

  useEffect(() => {
    if (!intervalMs) return undefined
    saved.current?.()
    const id = window.setInterval(() => {
      saved.current?.()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
}
