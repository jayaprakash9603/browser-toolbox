import { useEffect, useState } from 'react'

/** Current time, refreshed on each second boundary while `live` is true. */
export function useNow(live = true): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!live) return
    let timer = 0
    const tick = () => {
      setNow(new Date())
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000))
    return () => window.clearTimeout(timer)
  }, [live])
  return now
}
