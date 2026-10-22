const OFFSCREEN_PATH = 'offscreen.html'

/** Each feature holds a lease while it needs the shared offscreen document. */
const leases = new Set<string>()
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
      reasons: [
        chrome.offscreen.Reason.BLOBS,
        chrome.offscreen.Reason.USER_MEDIA,
        chrome.offscreen.Reason.AUDIO_PLAYBACK,
      ],
      justification:
        'Build downloads locally, run the internet connection monitor, and record the current tab.',
    })
    .finally(() => {
      creating = null
    })
  await creating
}

export async function acquireOffscreen(owner: string): Promise<void> {
  leases.add(owner)
  await ensureOffscreenDocument()
}

export async function releaseOffscreen(owner: string): Promise<void> {
  leases.delete(owner)
  if (leases.size > 0 || !(await hasOffscreenDocument())) return
  await chrome.offscreen.closeDocument()
}

export function keepOffscreenAlive(feature: string, keep: boolean): void {
  if (keep) void acquireOffscreen(feature)
  else void releaseOffscreen(feature)
}

/** @deprecated Prefer acquireOffscreen/releaseOffscreen with a unique owner per job. */
export async function releaseOffscreenDocument(): Promise<void> {
  if (leases.size > 0 || !(await hasOffscreenDocument())) return
  await chrome.offscreen.closeDocument()
}

/** Test helper: current lease owners. */
export function offscreenLeaseOwners(): ReadonlySet<string> {
  return leases
}

/** @internal Clears leases between vitest cases. */
export function resetOffscreenLeasesForTests(): void {
  leases.clear()
}
