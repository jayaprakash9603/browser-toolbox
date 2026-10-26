import {
  COLOR_PICKER_KEY,
  addPickedColor,
  normalizeColorPickerState,
  type ColorFormat,
  type ColorPickerState,
} from './model'

let queue: Promise<unknown> = Promise.resolve()

export async function loadColorPickerState(): Promise<ColorPickerState> {
  try {
    const stored = await chrome.storage.local.get(COLOR_PICKER_KEY)
    return normalizeColorPickerState(stored[COLOR_PICKER_KEY])
  } catch {
    return normalizeColorPickerState(null)
  }
}

/** Read-modify-write so the panel and the background never overwrite each other with a stale copy. */
export function updateColorPickerState(
  mutate: (current: ColorPickerState) => ColorPickerState,
): Promise<ColorPickerState> {
  const run = queue.then(async () => {
    const next = mutate(await loadColorPickerState())
    await chrome.storage.local.set({ [COLOR_PICKER_KEY]: next })
    return next
  })
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function recordPickedColor(hex: string, format?: ColorFormat, url?: string): Promise<ColorPickerState> {
  return updateColorPickerState((state) => ({
    format: format ?? state.format,
    history: addPickedColor(state.history, hex, Date.now(), url),
  }))
}

export function watchColorPicker(listener: (state: ColorPickerState) => void): () => void {
  const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes[COLOR_PICKER_KEY]) {
      listener(normalizeColorPickerState(changes[COLOR_PICKER_KEY].newValue))
    }
  }
  chrome.storage.onChanged.addListener(onChanged)
  return () => chrome.storage.onChanged.removeListener(onChanged)
}
