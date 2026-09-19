import { useState, useEffect, useCallback } from "react"
import { categoryService } from "../api/categoryService"

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await categoryService.list()
      setCategories(res.categories || [])
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    const handleUpdate = () => fetchCategories()
    window.addEventListener("categories-updated", handleUpdate)
    return () => window.removeEventListener("categories-updated", handleUpdate)
  }, [fetchCategories])

  return { categories, loading, error, refresh: fetchCategories }
}
