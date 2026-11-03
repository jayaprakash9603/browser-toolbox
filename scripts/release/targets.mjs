export const RELEASE_TARGETS = [
  {
    id: 'chromium',
    browsers: ['chrome', 'edge', 'opera', 'brave'],
    outputDir: 'dist/chromium',
    archiveExtension: 'zip',
  },
  {
    id: 'firefox',
    browsers: ['firefox'],
    outputDir: 'dist/firefox',
    archiveExtension: 'zip',
  },
]

export const RELEASE_BROWSER_ALIASES = RELEASE_TARGETS.flatMap((target) =>
  target.browsers.map((browser) => ({ browser, target: target.id })),
)

export function targetForBrowser(browser) {
  return RELEASE_BROWSER_ALIASES.find((entry) => entry.browser === browser)?.target ?? null
}

export function releaseTarget(id) {
  return RELEASE_TARGETS.find((target) => target.id === id) ?? null
}

