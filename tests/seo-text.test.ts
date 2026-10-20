import { describe, expect, it } from 'vitest'

import {
  averageSentenceLength,
  containsLorem,
  keywordDensity,
  textToCodeRatio,
} from '@/core/engines/seo/text'

describe('seo text metrics', () => {
  it('computes text-to-code ratio', () => {
    expect(textToCodeRatio(500, 5000)).toBe(10)
  })

  it('finds keyword density', () => {
    const text = 'seo tools help seo teams improve seo rankings for seo projects'
    const top = keywordDensity(text, 1, 3)
    expect(top[0]?.phrase).toBe('seo')
    expect(top[0]?.count).toBeGreaterThan(1)
  })

  it('detects lorem ipsum', () => {
    expect(containsLorem('Lorem ipsum dolor sit amet')).toBe(true)
    expect(containsLorem('Real content only')).toBe(false)
  })

  it('averages sentence length', () => {
    expect(averageSentenceLength('One two. Three four five.')).toBeGreaterThan(0)
  })
})
