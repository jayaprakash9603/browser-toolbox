import { FORM_MEMORY_KEY, normalizeFormMemoryState, type FormMemoryState } from './model'

let queue: Promise<unknown> = Promise.resolve()

export async function loadFormMemory(): Promise<FormMemoryState> {
  try {
    const stored = await chrome.storage.local.get(FORM_MEMORY_KEY)
    return normalizeFormMemoryState(stored[FORM_MEMORY_KEY])
  } catch {
    return normalizeFormMemoryState(null)
  }
}

/** Read-modify-write so captures from several tabs and edits in the panel never drop each other. */
export function updateFormMemory(mutate: (current: FormMemoryState) => FormMemoryState): Promise<FormMemoryState> {
  const run = queue.then(async () => {
    const current = await loadFormMemory()
    const next = mutate(current)
    if (next !== current) await chrome.storage.local.set({ [FORM_MEMORY_KEY]: next })
    return next
  })
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function watchFormMemory(listener: (state: FormMemoryState) => void): () => void {
  const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes[FORM_MEMORY_KEY]) {
      listener(normalizeFormMemoryState(changes[FORM_MEMORY_KEY].newValue))
    }
  }
  chrome.storage.onChanged.addListener(onChanged)
  return () => chrome.storage.onChanged.removeListener(onChanged)
}
