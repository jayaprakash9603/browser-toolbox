import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { DEFAULT_ADBLOCK_STATE } from './constants'
import { hostnameFromUrl, isAllowlisted, normalizeHostname } from './hostname'
import type { AdblockState } from './types'

export async function getAdblockState(): Promise<AdblockState> {
  const stored = await get<Partial<AdblockState>>(STORAGE_KEYS.adblock)
  return {
    ...DEFAULT_ADBLOCK_STATE,
    ...stored,
    lists: { ...DEFAULT_ADBLOCK_STATE.lists, ...stored?.lists },
    allowlist: stored?.allowlist ?? [],
  }
}

export async function updateAdblockState(patch: Partial<AdblockState>): Promise<AdblockState> {
  const current = await getAdblockState()
  const next: AdblockState = {
    ...current,
    ...patch,
    lists: patch.lists ? { ...current.lists, ...patch.lists } : current.lists,
    allowlist: patch.allowlist ?? current.allowlist,
  }
  await set(STORAGE_KEYS.adblock, next)
  return next
}

export async function toggleAllowlistHost(host: string): Promise<AdblockState> {
  const normalized = normalizeHostname(host)
  if (!normalized) return getAdblockState()
  const state = await getAdblockState()
  const has = state.allowlist.includes(normalized)
  const allowlist = has
    ? state.allowlist.filter((h) => h !== normalized)
    : [...state.allowlist, normalized]
  return updateAdblockState({ allowlist })
}

export async function addAllowlistHost(host: string): Promise<AdblockState> {
  const normalized = normalizeHostname(host)
  if (!normalized) return getAdblockState()
  const state = await getAdblockState()
  if (state.allowlist.includes(normalized)) return state
  return updateAdblockState({ allowlist: [...state.allowlist, normalized] })
}

export async function removeAllowlistHost(host: string): Promise<AdblockState> {
  const normalized = normalizeHostname(host)
  if (!normalized) return getAdblockState()
  const state = await getAdblockState()
  return updateAdblockState({
    allowlist: state.allowlist.filter((h) => h !== normalized),
  })
}

export function isBlockingActiveForUrl(state: AdblockState, pageUrl?: string): boolean {
  if (!state.enabled) return false
  if (!pageUrl) return true
  return !isAllowlisted(state.allowlist, pageUrl)
}

export function isYoutubeAdblockEnabled(state: AdblockState): boolean {
  return state.enabled && state.youtubeEnabled && state.lists.youtube
}

export function isYoutubeBlockingActive(state: AdblockState, pageUrl?: string): boolean {
  if (!isYoutubeAdblockEnabled(state)) return false
  const host = hostnameFromUrl(pageUrl)
  if (host && !host.includes('youtube.com') && !host.includes('youtu.be')) return false
  return isBlockingActiveForUrl(state, pageUrl)
}

/** YouTube Control Panel mirror — toggles only YouTube rules/scripts in the ad blocker. */
export async function setYoutubeAdblockEnabled(on: boolean): Promise<AdblockState> {
  const current = await getAdblockState()
  if (!on) {
    return updateAdblockState({
      youtubeEnabled: false,
      lists: { ...current.lists, youtube: false },
    })
  }
  return updateAdblockState({
    enabled: current.enabled ? current.enabled : true,
    youtubeEnabled: true,
    lists: { ...current.lists, youtube: true },
  })
}
