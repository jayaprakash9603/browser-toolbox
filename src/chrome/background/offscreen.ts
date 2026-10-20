const OFFSCREEN_PATH = 'offscreen.html'

/** Features that need the offscreen page to stay open (e.g. the internet monitor's probe loop). */
const keepers = new Set<string>()
let creating: Promise<void> | null = null

export async function hasOffscreenDocument(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  })
  return contexts.length > 0
}

/** Only one offscreen document may exist per extension, so every feature shares this one. */
export async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) return
  creating ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: 'Build downloads locally and run the internet connection monitor.',
    })
    .finally(() => {
      creating = null
    })
  await creating
}

export function keepOffscreenAlive(feature: string, keep: boolean): void {
  if (keep) keepers.add(feature)
  else keepers.delete(feature)
}

/** Closes the shared document unless another feature still depends on it. */
export async function releaseOffscreenDocument(): Promise<void> {
  if (keepers.size > 0 || !(await hasOffscreenDocument())) return
  await chrome.offscreen.closeDocument()
}
