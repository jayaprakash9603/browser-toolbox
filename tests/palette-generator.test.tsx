import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import { colorDistance, oklchToRgb, rgbToHex, rgbToOklch, simulateVision } from '@/core/engines/color'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import PaletteGeneratorTool from '@/tools/design/palette-generator/Tool'
import { LIBRARY } from '@/tools/design/palette-generator/library'
import {
  HARMONIES,
  MAX_COLORS,
  applyHarmony,
  buildExport,
  buildScale,
  confusablePairs,
  createSwatches,
  describeColor,
  extractPalette,
  formatColor,
  harmonyHexes,
  hexToRgb,
  regenerate,
  textOn,
  wcagLevel,
} from '@/tools/design/palette-generator/paletteModel'
import { resetChromeMockStorage } from './setup'

registerModules()

describe('oklch and vision helpers', () => {
  it('round-trips sRGB through OKLCH', () => {
    for (const hex of ['#3b82f6', '#ef4444', '#10b981', '#000000', '#ffffff', '#808080']) {
      expect(rgbToHex(oklchToRgb(rgbToOklch(hexToRgb(hex))))).toBe(hex)
    }
  })

  it('maps out-of-gamut colors back into sRGB', () => {
    const rgb = oklchToRgb({ l: 0.7, c: 0.4, h: 150 })
    for (const channel of [rgb.r, rgb.g, rgb.b]) {
      expect(channel).toBeGreaterThanOrEqual(0)
      expect(channel).toBeLessThanOrEqual(255)
    }
  })

  it('simulates color vision and flags confusable pairs', () => {
    expect(simulateVision({ r: 10, g: 20, b: 30 }, 'normal')).toEqual({ r: 10, g: 20, b: 30 })
    const gray = simulateVision({ r: 255, g: 0, b: 0 }, 'achromatopsia')
    expect(gray.r).toBe(gray.g)
    expect(gray.g).toBe(gray.b)
    // Red and green of similar lightness collapse for deuteranopes.
    expect(confusablePairs(['#d9534f', '#8a9a00'], 'deuteranopia', 0.08)).toEqual([[0, 1]])
    expect(confusablePairs(['#000000', '#ffffff'], 'deuteranopia')).toEqual([])
    expect(colorDistance({ r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 0 })).toBe(0)
  })
})

describe('palette model', () => {
  it('builds every harmony with the base first and enough colors', () => {
    for (const harmony of HARMONIES) {
      const hexes = harmonyHexes('#3b82f6', harmony, () => 0.3)
      expect(hexes).toHaveLength(MAX_COLORS)
      expect(hexes[0]).toBe('#3b82f6')
      for (const hex of hexes) expect(hex).toMatch(/^#[\da-f]{6}$/)
    }
    const complementary = harmonyHexes('#ff0000', 'complementary')
    expect(complementary[1]).toBe('#00ffff')
  })

  it('keeps locked colors when regenerating and applying harmonies', () => {
    const swatches = createSwatches(['#111111', '#3b82f6', '#222222', '#333333', '#444444'])
    swatches[1].locked = true
    const { swatches: next, base } = regenerate(swatches, 'triadic', () => 0.7)
    expect(base).toBe('#3b82f6')
    expect(next[1]).toEqual(swatches[1])
    expect(next.map((s) => s.id)).toEqual(swatches.map((s) => s.id))
    const unlocked = (list: typeof swatches) => list.filter((_, i) => i !== 1).map((s) => s.hex)
    expect(unlocked(next)).not.toEqual(unlocked(swatches))

    const applied = applyHarmony(swatches, '#ff0000', 'analogous')
    expect(applied[1].hex).toBe('#3b82f6')
    expect(applied[0].hex).toBe('#ff0000')
  })

  it('builds a 50–950 scale that contains the source color and darkens steadily', () => {
    const scale = buildScale('#3b82f6')
    expect(scale.map((s) => s.step)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])
    expect(scale.filter((s) => s.isBase)).toHaveLength(1)
    expect(scale.find((s) => s.isBase)?.hex).toBe('#3b82f6')
    const lightness = scale.map((s) => rgbToOklch(hexToRgb(s.hex)).l)
    for (let i = 1; i < lightness.length; i += 1) expect(lightness[i]).toBeLessThan(lightness[i - 1])
  })

  it('names colors and picks readable text', () => {
    expect(describeColor('#3b82f6').hue).toBe('blue')
    expect(describeColor('#ffffff')).toEqual({ hue: 'white', tone: null })
    expect(describeColor('#7f7f7f').hue).toBe('gray')
    expect(textOn('#ffff00').hex).toBe('#0a0a0a')
    expect(textOn('#1e3a8a').hex).toBe('#ffffff')
    expect(wcagLevel(7.2)).toBe('AAA')
    expect(wcagLevel(4.6)).toBe('AA')
    expect(wcagLevel(3.2)).toBe('AA18')
    expect(wcagLevel(2)).toBe('fail')
  })

  it('formats values and exports every format', () => {
    expect(formatColor('#3b82f6', 'rgb')).toBe('rgb(59 130 246)')
    expect(formatColor('#3b82f6', 'hsl')).toBe('hsl(217 91% 60%)')
    expect(formatColor('#3b82f6', 'oklch')).toMatch(/^oklch\(62\.\d% 0\.\d{2,3} 259\.\d\)$/)

    const hexes = ['#3b82f6', '#f59e0b', '#10b981']
    expect(buildExport(hexes, { format: 'css', value: 'hex', scales: false })).toBe(
      ':root {\n  --color-primary: #3b82f6;\n  --color-secondary: #f59e0b;\n  --color-accent: #10b981;\n}',
    )
    expect(buildExport(hexes, { format: 'tailwind4', value: 'hex', scales: true })).toContain('--color-primary-950:')
    expect(buildExport(hexes, { format: 'scss', value: 'rgb', scales: false })).toContain('$accent: rgb(16 185 129);')
    expect(buildExport(hexes, { format: 'tailwind3', value: 'hex', scales: true })).toContain("DEFAULT: '#3b82f6'")
    expect(JSON.parse(buildExport(hexes, { format: 'json', value: 'hex', scales: false }))).toEqual({
      primary: '#3b82f6',
      secondary: '#f59e0b',
      accent: '#10b981',
    })
    const tokens = JSON.parse(buildExport(hexes, { format: 'tokens', value: 'hex', scales: true }))
    expect(tokens.color.primary.base).toEqual({ $type: 'color', $value: '#3b82f6' })
    expect(tokens.color.primary['500'].$type).toBe('color')
    expect(buildExport(hexes, { format: 'svg', value: 'hex', scales: false })).toContain('fill="#f59e0b"')
  })

  it('extracts dominant colors from pixels, most common first', () => {
    const pixels: number[] = []
    for (let i = 0; i < 60; i += 1) pixels.push(250, 10, 10, 255)
    for (let i = 0; i < 30; i += 1) pixels.push(10, 10, 250, 255)
    for (let i = 0; i < 10; i += 1) pixels.push(0, 0, 0, 0)
    const colors = extractPalette(new Uint8ClampedArray(pixels), 3)
    expect(colors[0]).toBe('#fa0a0a')
    expect(colors[1]).toBe('#0a0afa')
    expect(colors).toHaveLength(2)
    expect(extractPalette(new Uint8ClampedArray([0, 0, 0, 0]), 3)).toEqual([])
  })

  it('ships a library of valid palettes', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(30)
    expect(new Set(LIBRARY.map((p) => p.id)).size).toBe(LIBRARY.length)
    for (const palette of LIBRARY) for (const hex of palette.colors) expect(hex).toMatch(/^#[\da-f]{6}$/)
  })
})

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <PaletteGeneratorTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

const palette = () => within(screen.getByRole('region', { name: 'Palette' }))
const swatchButtons = () => palette().getAllByRole('button', { name: /Select to inspect/ })
const hexesShown = () => swatchButtons().map((button) => /#[\da-f]{6}/.exec(button.getAttribute('aria-label') ?? '')?.[0])

beforeEach(() => {
  resetChromeMockStorage()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => cleanup())

describe('Palette Generator UI', () => {
  it('starts from an analogous palette and inspects the first color', () => {
    renderTool()
    expect(swatchButtons()).toHaveLength(5)
    expect(hexesShown()[0]).toBe('#3b82f6')
    expect(screen.getByRole('radio', { name: /Analogous/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('rgb(59 130 246)')).toBeInTheDocument()
  })

  it('regenerates unlocked colors, keeps locked ones and can undo', () => {
    renderTool()
    const before = hexesShown()
    fireEvent.click(palette().getByRole('button', { name: 'Lock Primary' }))
    fireEvent.click(palette().getByRole('button', { name: /Generate/ }))
    const after = hexesShown()
    expect(after[0]).toBe(before[0])
    expect(after.slice(1)).not.toEqual(before.slice(1))
    fireEvent.click(palette().getByRole('button', { name: /^Undo/ }))
    fireEvent.click(palette().getByRole('button', { name: /^Undo/ }))
    expect(hexesShown()).toEqual(before)
  })

  it('switches harmony and updates the base color from the input', () => {
    renderTool()
    fireEvent.click(screen.getByRole('radio', { name: /Complementary/ }))
    expect(hexesShown()[1]).not.toBe(undefined)
    const input = screen.getByLabelText('Base color')
    fireEvent.change(input, { target: { value: '#ff0000' } })
    expect(hexesShown()[0]).toBe('#ff0000')
    expect(hexesShown()[1]).toBe('#00ffff')
  })

  it('adds and removes colors within limits', () => {
    renderTool()
    fireEvent.click(palette().getByRole('button', { name: 'Add a color' }))
    expect(swatchButtons()).toHaveLength(6)
    fireEvent.click(palette().getByRole('button', { name: /^Remove/ }))
    expect(swatchButtons()).toHaveLength(5)
  })

  it('saves palettes and loads them from the library', async () => {
    renderTool()
    fireEvent.click(palette().getByRole('button', { name: /^Save$/ }))
    expect(JSON.parse(localStorage.getItem('palette-generator:saved') ?? '[]')).toHaveLength(1)

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Library/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Load Nord palette' }))
    expect(hexesShown()).toEqual(['#2e3440', '#4c566a', '#88c0d0', '#5e81ac', '#eceff4'])

    const savedFilter = screen.getByRole('radio', { name: /Saved \(1\)/ })
    fireEvent.click(savedFilter)
    expect(savedFilter).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Delete / }))
    expect(localStorage.getItem('palette-generator:saved')).toBe('[]')
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument()
  })

  it('shows contrast, export and preview views', async () => {
    renderTool()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Contrast/ }))
    expect(screen.getByRole('table', { name: /Contrast ratio/ })).toBeInTheDocument()
    expect(screen.getByText(/text and background pairs pass AA/)).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Export/ }))
    expect(screen.getByLabelText('Exported code').textContent).toContain('--color-primary: #3b82f6;')
    fireEvent.click(screen.getByRole('radio', { name: 'Tailwind v4' }))
    await waitFor(() => expect(screen.getByLabelText('Exported code').textContent).toContain('@theme {'))

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Preview/ }))
    expect(screen.getByRole('img', { name: 'Sample app interface using the palette' })).toBeInTheDocument()
  })
})
