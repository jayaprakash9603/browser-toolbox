import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'

import { exportScrapeCsv, exportScrapeXlsx, type ScrapeColumn } from '@/core/scraper'

const columns: ScrapeColumn[] = [
  { key: 'a', label: 'Name', relativeSelector: 'span', attr: 'text' },
]

describe('scraper export', () => {
  it('csv has bom and formula guard', () => {
    const csv = exportScrapeCsv([{ a: '=1+1' }], columns)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain("'=1+1")
  })

  it('xlsx contains sheet xml', () => {
    const zip = exportScrapeXlsx([{ a: 'hi' }], columns)
    const files = unzipSync(zip)
    const sheet = files['xl/worksheets/sheet1.xml']
    expect(sheet).toBeDefined()
    const text = new TextDecoder().decode(sheet)
    expect(text).toContain('hi')
  })
})
