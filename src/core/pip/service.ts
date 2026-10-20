import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import type { PipState } from './types'

export const DEFAULT_PIP_STATE: PipState = {
  enabled: true,
  autoPip: false,
  showContextMenu: true,
}

export async function getPipState(): Promise<PipState> {
  const stored = await get<Partial<PipState>>(STORAGE_KEYS.pip)
  if (!stored) return { ...DEFAULT_PIP_STATE }
  return {
    enabled: stored.enabled ?? DEFAULT_PIP_STATE.enabled,
    autoPip: stored.autoPip ?? DEFAULT_PIP_STATE.autoPip,
    showContextMenu: stored.showContextMenu ?? DEFAULT_PIP_STATE.showContextMenu,
  }
}

export async function updatePipState(patch: Partial<PipState>): Promise<PipState> {
  const current = await getPipState()
  const next: PipState = {
    enabled: patch.enabled ?? current.enabled,
    autoPip: patch.autoPip ?? current.autoPip,
    showContextMenu: patch.showContextMenu ?? current.showContextMenu,
  }
  await set(STORAGE_KEYS.pip, next)
  return next
}
