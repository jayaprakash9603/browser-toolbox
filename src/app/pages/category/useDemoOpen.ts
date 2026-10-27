import { useState } from 'react'

const OPEN_KEY = 'tbx.category.demo.open'

function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeOpen(open: boolean) {
  try {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // Storage can be unavailable in private contexts; the toggle still works for this visit.
  }
}

/** Whether the category demo panel is open. Closed until the user opens it, then remembered. */
export function useDemoOpen() {
  const [open, setOpen] = useState(readOpen)
  const toggle = () => {
    writeOpen(!open)
    setOpen(!open)
  }
  return [open, toggle] as const
}
