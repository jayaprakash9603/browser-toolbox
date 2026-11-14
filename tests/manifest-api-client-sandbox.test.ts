import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const manifestConfigSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../manifest.config.ts'),
  'utf8',
)

describe('Chromium manifest API client sandbox', () => {
  it('declares script-sandbox.html as an MV3 sandbox page', () => {
    expect(manifestConfigSource).toContain("pages: ['script-sandbox.html']")
  })

  it('ships the brand mark at AMO listing sizes and on the Firefox sidebar button', () => {
    expect(manifestConfigSource).toContain("32: 'public/icons/icon32.png'")
    expect(manifestConfigSource).toContain("64: 'public/icons/icon64.png'")
    expect(manifestConfigSource).toContain("128: 'public/icons/icon128.png'")
    expect(manifestConfigSource).toContain('default_icon: extensionIcons')
  })
})
