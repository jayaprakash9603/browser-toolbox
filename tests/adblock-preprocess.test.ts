import { describe, expect, it } from 'vitest'

// @ts-expect-error build-time converter modules are plain ESM
import { evaluateCondition, FIREFOX_MV3_ENV, preprocessList, SHIPPED_MV3_ENV } from '../scripts/adblock/converter/preprocess.mjs'

describe('uBO list preprocessor', () => {
  it('evaluates conditions for Chromium MV3', () => {
    expect(evaluateCondition('env_chromium')).toBe(true)
    expect(evaluateCondition('env_firefox')).toBe(false)
    expect(evaluateCondition('!cap_html_filtering')).toBe(true)
    expect(evaluateCondition('env_mv3 && !env_mobile')).toBe(true)
    expect(evaluateCondition('(env_firefox || env_safari) && env_mv3')).toBe(false)
    expect(evaluateCondition('env_chromium &&')).toBe(false)
  })

  it('resolves nested !#if / !#else blocks and includes sibling files', async () => {
    const text = [
      'a',
      '!#if env_firefox',
      'firefox-only',
      '!#if env_mv3',
      'nested',
      '!#endif',
      '!#else',
      'not-firefox',
      '!#endif',
      '!#include extra.txt',
      '!#include ../escape.txt',
      'z',
    ].join('\n')
    const loaded: string[] = []
    const lines = await preprocessList(text, async (name: string) => {
      loaded.push(name)
      return '!#if env_mobile\nmobile\n!#endif\nfrom-include'
    })
    expect(lines).toEqual(['a', 'not-firefox', 'from-include', 'z'])
    expect(loaded).toEqual(['extra.txt'])
  })

  it('includes firefox sections in SHIPPED_MV3_ENV', () => {
    expect(evaluateCondition('env_firefox', SHIPPED_MV3_ENV)).toBe(true)
    expect(evaluateCondition('env_chromium', SHIPPED_MV3_ENV)).toBe(true)
    expect(evaluateCondition('env_mobile', SHIPPED_MV3_ENV)).toBe(false)
    expect(evaluateCondition('env_firefox', FIREFOX_MV3_ENV)).toBe(true)
    expect(evaluateCondition('env_chromium', FIREFOX_MV3_ENV)).toBe(false)
  })
})
