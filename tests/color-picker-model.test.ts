import { describe, expect, it } from 'vitest'

import {
  COLOR_PICKER_HISTORY_LIMIT,
  addPickedColor,
  formatColor,
  normalizeColorPickerState,
  pageFormatFor,
} from '@/core/color-picker/model'

describe('color picker model', () => {
  it('formats a color in every supported format', () => {
    const rgb = { r: 59, g: 130, b: 246 }
    expect(formatColor(rgb, 'hex')).toBe('#3b82f6')
    expect(formatColor(rgb, 'rgb')).toBe('rgb(59, 130, 246)')
    expect(formatColor(rgb, 'hsl')).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
    expect(formatColor(rgb, 'hsv')).toMatch(/^hsv\(/)
    expect(formatColor(rgb, 'hwb')).toMatch(/^hwb\(/)
    expect(formatColor(rgb, 'cmyk')).toMatch(/^cmyk\(/)
    expect(formatColor(rgb, 'oklch')).toMatch(/^oklch\(\d+\.\d% \d\.\d{3} \d+\.\d\)$/)
  })

  it('moves a re-picked color to the front instead of duplicating it', () => {
    let history = addPickedColor([], '#ff0000', 1)
    history = addPickedColor(history, '#00ff00', 2)
    history = addPickedColor(history, '#FF0000', 3, 'https://example.com')
    expect(history.map((item) => item.hex)).toEqual(['#ff0000', '#00ff00'])
    expect(history[0]).toMatchObject({ at: 3, url: 'https://example.com' })
  })

  it('ignores invalid colors and caps the history', () => {
    expect(addPickedColor([], 'nope', 1)).toEqual([])
    let history = [] as ReturnType<typeof addPickedColor>
    for (let i = 0; i < COLOR_PICKER_HISTORY_LIMIT + 10; i += 1) {
      history = addPickedColor(history, `#${i.toString(16).padStart(6, '0')}`, i)
    }
    expect(history).toHaveLength(COLOR_PICKER_HISTORY_LIMIT)
  })

  it('normalizes stored state defensively', () => {
    expect(normalizeColorPickerState(null)).toEqual({ format: 'hex', history: [] })
    const state = normalizeColorPickerState({
      format: 'cmyk',
      history: [{ hex: '#ABCDEF', at: 5 }, { hex: 'garbage' }, null],
    })
    expect(state.format).toBe('cmyk')
    expect(state.history).toEqual([{ hex: '#abcdef', at: 5 }])
    expect(normalizeColorPickerState({ format: 'nope' }).format).toBe('hex')
  })

  it('limits the on-page picker to the formats it can cycle', () => {
    expect(pageFormatFor('rgb')).toBe('rgb')
    expect(pageFormatFor('oklch')).toBe('hex')
  })
})
