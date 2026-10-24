import { TIMER_STORAGE_KEY, normalizeTimerSnapshot, type TimerSnapshot } from './model'

let queue: Promise<unknown> = Promise.resolve()

export async function loadTimer(): Promise<TimerSnapshot> {
  try {
    const stored = await chrome.storage.local.get(TIMER_STORAGE_KEY)
    return normalizeTimerSnapshot(stored[TIMER_STORAGE_KEY])
  } catch {
    return normalizeTimerSnapshot(null)
  }
}

export async function saveTimer(snapshot: TimerSnapshot): Promise<void> {
  await chrome.storage.local.set({ [TIMER_STORAGE_KEY]: snapshot })
}

export function updateTimer(mutate: (current: TimerSnapshot) => TimerSnapshot): Promise<TimerSnapshot> {
  const run = queue.then(async () => {
    const current = await loadTimer()
    const next = mutate(current)
    await saveTimer(next)
    return next
  })
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
