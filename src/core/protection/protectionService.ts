import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { normalizeHostname } from '@/core/adblock/hostname'

import { DEFAULT_PROTECTION_STATE, emptyProtectionStats } from './constants'
import type { ProtectionState, ProtectionStats, ThreatCategory } from './types'

export async function getProtectionState(): Promise<ProtectionState> {
  const stored = await get<Partial<ProtectionState>>(STORAGE_KEYS.protection)
  return {
    ...DEFAULT_PROTECTION_STATE,
    ...stored,
    trusted: stored?.trusted ?? [],
  }
}

export async function updateProtectionState(patch: Partial<ProtectionState>): Promise<ProtectionState> {
  const current = await getProtectionState()
  const next: ProtectionState = {
    ...current,
    ...patch,
    trusted: patch.trusted ?? current.trusted,
  }
  await set(STORAGE_KEYS.protection, next)
  return next
}

export async function getProtectionStats(): Promise<ProtectionStats> {
  const stored = await get<Partial<ProtectionStats>>(STORAGE_KEYS.protectionStats)
  if (!stored?.blocked) return emptyProtectionStats()
  return {
    blocked: { ...emptyProtectionStats().blocked, ...stored.blocked },
    recent: stored.recent ?? [],
    since: stored.since ?? Date.now(),
  }
}

export async function recordProtectionBlock(
  category: ThreatCategory,
  host: string,
): Promise<ProtectionStats> {
  const stats = await getProtectionStats()
  stats.blocked[category] = (stats.blocked[category] ?? 0) + 1
  const entry = { host, category, at: Date.now() }
  stats.recent = [entry, ...stats.recent.filter((r) => r.host !== host || r.category !== category)].slice(
    0,
    20,
  )
  await set(STORAGE_KEYS.protectionStats, stats)
  return stats
}

export async function resetProtectionStats(): Promise<ProtectionStats> {
  const stats = emptyProtectionStats()
  await set(STORAGE_KEYS.protectionStats, stats)
  return stats
}

export async function addTrustedHost(host: string): Promise<ProtectionState> {
  const normalized = normalizeHostname(host)
  if (!normalized) return getProtectionState()
  const state = await getProtectionState()
  if (state.trusted.includes(normalized)) return state
  return updateProtectionState({ trusted: [...state.trusted, normalized] })
}

export async function removeTrustedHost(host: string): Promise<ProtectionState> {
  const normalized = normalizeHostname(host)
  if (!normalized) return getProtectionState()
  const state = await getProtectionState()
  return updateProtectionState({
    trusted: state.trusted.filter((h) => h !== normalized),
  })
}

export function isTrustedHost(trusted: string[], pageUrl?: string): boolean {
  if (!pageUrl) return false
  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, '').toLowerCase()
    return trusted.some((t) => host === t || host.endsWith(`.${t}`))
  } catch {
    return false
  }
}
