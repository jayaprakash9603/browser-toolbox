import { describe, expect, it } from 'vitest'

import { WHATSAPP_FEATURES, featureLabelKey } from '@/core/sites/whatsapp'
import { sitesWhatsappStrings } from '@/i18n/locales/sitesWhatsappEn'

describe('whatsapp feature catalog', () => {
  it('has unique feature ids', () => {
    const ids = WHATSAPP_FEATURES.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has i18n label keys for every feature', () => {
    for (const f of WHATSAPP_FEATURES) {
      expect(sitesWhatsappStrings[featureLabelKey(f.id)]).toBeTruthy()
    }
  })
})
