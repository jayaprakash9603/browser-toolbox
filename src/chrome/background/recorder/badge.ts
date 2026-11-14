import { badgeTime } from '@/core/recorder/format'
import { countdownSecondsLeft, elapsedMs } from '@/core/recorder/session'
import type { RecorderSession } from '@/core/recorder/types'

let holding = false

/** True while a recording session owns the toolbar badge (countdown / REC / timer). */
export function recorderOwnsActionBadge(): boolean {
  return holding
}

export function recorderBadgeText(session: RecorderSession, now: number): string {
  if (session.phase === 'stopping') return '…'
  const countdown = countdownSecondsLeft(session, now)
  if (countdown > 0) return String(countdown)
  if (session.phase === 'pending') return 'REC'
  return badgeTime(elapsedMs(session, now))
}

export function recorderBadgeColor(session: RecorderSession): string {
  return session.phase === 'paused' || session.phase === 'stopping' ? '#f59e0b' : '#dc2626'
}

async function stamp(text: string, color: string, tabId?: number): Promise<void> {
  const target = tabId != null ? { tabId } : {}
  await chrome.action.setBadgeBackgroundColor({ color, ...target })
  try {
    await chrome.action.setBadgeTextColor?.({ color: '#ffffff', ...target })
  } catch {
    /* Firefox / older Chrome */
  }
  await chrome.action.setBadgeText({ text, ...target })
}

async function releaseAdblockBadge(): Promise<void> {
  try {
    const { getAdblockState } = await import('@/core/adblock')
    const { configureBadge } = await import('../adblock/stats')
    await configureBadge((await getAdblockState()).enabled)
  } catch {
    await chrome.declarativeNetRequest
      ?.setExtensionActionOptions?.({ displayActionCountAsBadgeText: false })
      .catch(() => undefined)
  }
}

/** Global + per-tab badge so refresh and other sites still show 3-2-1 / REC / the timer. */
export async function applyRecorderToolbarBadge(session: RecorderSession | null): Promise<void> {
  if (!session) {
    if (!holding) return
    holding = false
    await chrome.action.setBadgeText({ text: '' })
    const tabs = await chrome.tabs.query({})
    await Promise.all(
      tabs.map((tab) =>
        tab.id != null ? chrome.action.setBadgeText({ text: '', tabId: tab.id }).catch(() => undefined) : undefined,
      ),
    )
    await releaseAdblockBadge()
    return
  }

  if (!holding) {
    holding = true
    try {
      await chrome.declarativeNetRequest?.setExtensionActionOptions?.({
        displayActionCountAsBadgeText: false,
      })
    } catch {
      /* DNR action badge not available */
    }
  }

  const now = Date.now()
  const text = recorderBadgeText(session, now)
  const color = recorderBadgeColor(session)
  await stamp(text, color)
  const tabs = await chrome.tabs.query({})
  await Promise.all(
    tabs.map((tab) => (tab.id != null ? stamp(text, color, tab.id).catch(() => undefined) : undefined)),
  )
}

export async function stampRecorderBadgeOnTab(tabId: number, session: RecorderSession): Promise<void> {
  if (!holding) await applyRecorderToolbarBadge(session)
  await stamp(recorderBadgeText(session, Date.now()), recorderBadgeColor(session), tabId).catch(() => undefined)
}
