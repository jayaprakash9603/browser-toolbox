import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { normalizeHostname } from '@/core/adblock/hostname'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'

import { emptyProtectionStats, MAX_RECENT_ENTRIES, mergeProtectionState } from './constants'
import { THREAT_CATEGORIES } from './types'
import type { ProtectionState, ProtectionStats, ThreatCategory } from './types'

export function isThreatCategory(value: unknown): value is ThreatCategory {
  return typeof value === 'string' && (THREAT_CATEGORIES as readonly string[]).includes(value)
}

export async function getProtectionState(): Promise<ProtectionState> {
  const stored = await get<Partial<ProtectionState>>(STORAGE_KEYS.protection)
  return mergeProtectionState(stored)
}

export async function updateProtectionState(patch: Partial<ProtectionState>): Promise<ProtectionState> {
  const current = await getProtectionState()
  if (patch.enabled && !current.enabled && !(await requestAllSitesAccess())) return current
  const rp = patch.redirectProtection
  const merged: Partial<ProtectionState> = {
    ...current,
    ...patch,
    trusted: patch.trusted ?? current.trusted,
    workflowHosts: patch.workflowHosts ?? current.workflowHosts,
    redirectProtection: rp
      ? {
          ...current.redirectProtection,
          ...rp,
          riskWeights: { ...current.redirectProtection.riskWeights, ...rp.riskWeights },
        }
      : current.redirectProtection,
  }
  const next = mergeProtectionState(merged)
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
  // reports arrive from web pages, so only known categories may touch storage
  if (!isThreatCategory(category)) return stats
  stats.blocked[category] = (stats.blocked[category] ?? 0) + 1
  const entry = { host: host.slice(0, 253), category, at: Date.now() }
  stats.recent = [entry, ...stats.recent.filter((r) => r.host !== host || r.category !== category)].slice(
    0,
    MAX_RECENT_ENTRIES,
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
    return hostMatchesTrustedList(host, trusted)
  } catch {
    return false
  }
}

/** Match a bare hostname or registrable site label against the trusted list (includes subdomains). */
export function isTrustedSiteHost(trusted: string[], hostOrSite: string | null | undefined): boolean {
  if (!hostOrSite) return false
  const host = hostOrSite.replace(/^www\./, '').toLowerCase()
  return hostMatchesTrustedList(host, trusted)
}

function hostMatchesTrustedList(host: string, trusted: string[]): boolean {
  return trusted.some((t) => {
    const entry = t.replace(/^www\./, '').toLowerCase()
    return host === entry || host.endsWith(`.${entry}`)
  })
}

export function isProtectionActiveForUrl(
  state: Pick<import('./types').ProtectionState, 'enabled' | 'trusted'>,
  pageUrl?: string,
): boolean {
  if (!state.enabled) return false
  if (isTrustedHost(state.trusted, pageUrl)) return false
  return true
}
