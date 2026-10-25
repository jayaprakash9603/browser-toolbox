import { describe, expect, it } from 'vitest'

import { parseMetadata, pickLocalized, serializeMetadata } from '@/core/script-studio/metadata'

const SAMPLE = `// ==UserScript==
// @name         Demo Script
// @name:de      Demo Skript
// @namespace    https://example.com/
// @version      1.2.3
// @description  Does things
// @grant        GM_setValue
// @grant        GM_getValue
// @match        https://example.com/*
// @require      https://cdn.example.com/lib.js#sha256-abc
// @resource     icon https://example.com/icon.png
// @connect      example.com
// @run-at       document-start
// ==/UserScript==

console.log('hi');
`

describe('script-studio metadata', () => {
  it('parses header fields', () => {
    const meta = parseMetadata(SAMPLE)
    expect(meta).not.toBeNull()
    expect(pickLocalized(meta!.name)).toBe('Demo Script')
    expect(meta!.name.de).toBe('Demo Skript')
    expect(meta!.version).toBe('1.2.3')
    expect(meta!.grants).toEqual(['GM_setValue', 'GM_getValue'])
    expect(meta!.matches).toEqual(['https://example.com/*'])
    expect(meta!.requires[0].url).toContain('lib.js')
    expect(meta!.resources[0].name).toBe('icon')
    expect(meta!.connects).toEqual(['example.com'])
    expect(meta!.runAt).toBe('document-start')
  })

  it('round-trips serialize', () => {
    const meta = parseMetadata(SAMPLE)!
    const block = serializeMetadata(meta)
    const reparsed = parseMetadata(`${block}\n\nconsole.log(1);`)
    expect(reparsed?.version).toBe(meta.version)
    expect(reparsed?.matches).toEqual(meta.matches)
  })
})
