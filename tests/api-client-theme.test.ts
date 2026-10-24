import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildApiClientTheme,
  hexToHslChannels,
  TOOLBOX_PALETTE_BRANDS,
  TOOLBOX_SURFACES,
} from '@/features/api-client/build-api-client-theme'
import { PALETTES } from '@/shared/lib/theme/palettes'

const css = readFileSync(resolve('src/styles/tokens.css'), 'utf8')

function declarations(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  expect(start, `tokens.css has a "${selector}" block`).toBeGreaterThanOrEqual(0)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value!.trim()]),
  )
}

const cssVar = (token: string) => `--${token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`

describe('API client theme', () => {
  it('uses the toolbox surface colors for light and dark mode', () => {
    const light = declarations(':root')
    const dark = { ...declarations('.dark'), ...declarations('.dark[data-palette]') }

    for (const [token, hex] of Object.entries(TOOLBOX_SURFACES.light)) {
      expect(hex, `light ${token}`).toBe(light[cssVar(token)])
    }
    for (const [token, hex] of Object.entries(TOOLBOX_SURFACES.dark)) {
      expect(hex, `dark ${token}`).toBe(dark[cssVar(token)])
    }
  })

  it('uses the accent colors of every toolbox palette', () => {
    expect(Object.keys(TOOLBOX_PALETTE_BRANDS).sort()).toEqual(PALETTES.map((p) => p.id).sort())

    for (const { id } of PALETTES) {
      const light = declarations(`[data-palette='${id}']`)
      const dark = declarations(`.dark[data-palette='${id}']`)
      for (const [token, hex] of Object.entries(TOOLBOX_PALETTE_BRANDS[id].light)) {
        expect(hex, `${id} light ${token}`).toBe(light[cssVar(token)])
      }
      for (const [token, hex] of Object.entries(TOOLBOX_PALETTE_BRANDS[id].dark)) {
        expect(hex, `${id} dark ${token}`).toBe(dark[cssVar(token)])
      }
    }
  })

  it('converts hex colors to the HSL channels postman-lite expects', () => {
    expect(hexToHslChannels('#ffffff')).toBe('0 0% 100%')
    expect(hexToHslChannels('#0a0a0a')).toBe('0 0% 3.9%')
    expect(hexToHslChannels('#38bdf8')).toBe('198.4 93.2% 59.6%')
    expect(hexToHslChannels('#f00')).toBe('0 100% 50%')
  })

  it('follows the selected palette and mode', () => {
    const ocean = buildApiClientTheme('dark', 'ocean')
    expect(ocean.mode).toBe('dark')
    expect(ocean.dark.primary).toBe(hexToHslChannels('#38bdf8'))
    expect(ocean.dark.ring).toBe(hexToHslChannels('#38bdf8'))
    expect(ocean.light.primary).toBe(hexToHslChannels('#0284c7'))
    expect(ocean.dark.border).toBe(hexToHslChannels('#2a3133'))
    expect(ocean.dark.radius).toBe('0.625rem')
    expect(ocean.dark.fontFamily).toContain('Inter Variable')

    expect(buildApiClientTheme('system').light.primary).toBe(hexToHslChannels('#4f46e5'))
  })
})
