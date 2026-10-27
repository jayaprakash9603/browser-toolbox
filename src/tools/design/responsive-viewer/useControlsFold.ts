import { useState } from 'react'

const FOLD_KEY = 'tbx.rv.controlsFolded'

function readFolded() {
  try {
    return localStorage.getItem(FOLD_KEY) === '1'
  } catch {
    return false
  }
}

/** Whether the device and view controls are folded away; remembered as a workspace preference. */
export function useControlsFold() {
  const [folded, setFolded] = useState(readFolded)
  const set = (next: boolean) => {
    try {
      localStorage.setItem(FOLD_KEY, next ? '1' : '0')
    } catch {
      // Storage can be unavailable; folding still works for this visit.
    }
    setFolded(next)
  }
  return [folded, set] as const
}
