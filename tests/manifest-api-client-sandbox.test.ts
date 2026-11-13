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
})
