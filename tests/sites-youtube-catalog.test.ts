import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  CSS_FEATURE_IDS,
  YOUTUBE_CSS_SELECTORS,
  YOUTUBE_FEATURES,
  featureAttrName,
  featureLabelKey,
} from '@/core/sites/youtube'
import { sitesYoutubeStrings } from '@/i18n/locales/sitesYoutubeEn'
import en from '@/i18n/locales/en'

describe('youtube feature catalog', () => {
  it('has unique feature ids', () => {
    const ids = YOUTUBE_FEATURES.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has i18n label keys for every feature', () => {
    for (const f of YOUTUBE_FEATURES) {
      expect(sitesYoutubeStrings[featureLabelKey(f.id)] ?? en[featureLabelKey(f.id) as keyof typeof en]).toBeTruthy()
    }
  })

  it('third-party features default off', () => {
    for (const f of YOUTUBE_FEATURES.filter((x) => x.thirdParty && x.kind === 'toggle')) {
      expect(f.default).not.toBe(true)
    }
  })

  it('css features with selectors are covered in youtube.css', () => {
    const css = readFileSync(resolve('public/sites/youtube/youtube.css'), 'utf8')
    for (const id of CSS_FEATURE_IDS) {
      const selectors = YOUTUBE_CSS_SELECTORS[id]
      if (!selectors?.length) continue
      const attr = featureAttrName(id)
      const hasAttr = css.includes(attr)
      const hasSelector = selectors.some((sel) => css.includes(sel.split(',')[0].trim()))
      expect(hasAttr || hasSelector).toBe(true)
    }
  })
})
