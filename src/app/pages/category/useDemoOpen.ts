import { useEffect, useState } from 'react'

const LEGACY_OPEN_KEY = 'tbx.category.demo.open'

/** Demo panel is closed until the user opens it; never restored from storage or after leaving the page. */
export function useDemoOpen(categoryId: string) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_OPEN_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [categoryId])

  const toggle = () => setOpen((current) => !current)
  return [open, toggle] as const
}
