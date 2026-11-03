export const EXTENSION_BUILD_TARGETS = ['chromium', 'firefox'] as const

export type ExtensionBuildTarget = (typeof EXTENSION_BUILD_TARGETS)[number]

export const DEFAULT_FIREFOX_EXTENSION_ID = 'one-panel@browser-toolbox'

export function resolveBuildTarget(value: string | undefined): ExtensionBuildTarget {
  return value === 'firefox' ? 'firefox' : 'chromium'
}

export function isFirefoxTarget(target: ExtensionBuildTarget): boolean {
  return target === 'firefox'
}

