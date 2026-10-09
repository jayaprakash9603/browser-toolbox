import { describe, expect, it } from 'vitest'

import { fullPageOffsets } from '@/core/engines/capture/pageActions'

describe('full page capture offsets', () => {
  it('uses one shot when the page fits the viewport', () => {
    expect(fullPageOffsets(800, 900)).toEqual([0])
  })

  it('steps down the page and ends on the last viewport', () => {
    expect(fullPageOffsets(2500, 1000)).toEqual([0, 1000, 1500])
  })
})
