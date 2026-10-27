import { STORAGE_KEYS } from '@/core/constants'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'
import { get, set } from '@/core/storage'

import type { ReactDevtoolsSurfaceKey } from './constants'

export type ReactDevtoolsThemeMode = 'system' | 'light' | 'dark'

export type ReactDevtoolsSurfaces = Record<ReactDevtoolsSurfaceKey, boolean>

export interface ReactDevtoolsState {
  enabled: boolean
  theme: ReactDevtoolsThemeMode
  surfaces: ReactDevtoolsSurfaces
}

export const DEFAULT_REACT_DEVTOOLS_SURFACES: ReactDevtoolsSurfaces = {
  components: true,
  profiler: true,
  suspense: true,
  elementsSidebar: true,
  sourcesEditor: true,
}

export const DEFAULT_REACT_DEVTOOLS_STATE: ReactDevtoolsState = {
  enabled: false,
  theme: 'system',
  surfaces: { ...DEFAULT_REACT_DEVTOOLS_SURFACES },
}

export async function getReactDevtoolsState(): Promise<ReactDevtoolsState> {
  const stored = await get<Partial<ReactDevtoolsState>>(STORAGE_KEYS.reactDevtools)
  if (!stored) return { ...DEFAULT_REACT_DEVTOOLS_STATE, surfaces: { ...DEFAULT_REACT_DEVTOOLS_SURFACES } }
  return {
    ...DEFAULT_REACT_DEVTOOLS_STATE,
    ...stored,
    surfaces: { ...DEFAULT_REACT_DEVTOOLS_SURFACES, ...stored.surfaces },
  }
}

export async function setReactDevtoolsState(
  patch: Partial<ReactDevtoolsState>,
): Promise<ReactDevtoolsState> {
  const current = await getReactDevtoolsState()
  if (patch.enabled && !current.enabled && !(await requestAllSitesAccess())) return current
  const next = { ...current, ...patch }
  if (patch.surfaces) {
    next.surfaces = { ...DEFAULT_REACT_DEVTOOLS_SURFACES, ...patch.surfaces }
  }
  await set(STORAGE_KEYS.reactDevtools, next)
  return next
}
