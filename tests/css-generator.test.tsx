import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/app/App'
import { registerModules } from '@/modules'
import {
  animationDefaults,
  buildAnimation,
  buildBorder,
  buildClipPath,
  buildFilter,
  buildGlass,
  buildGradient,
  buildGrid,
  buildRadius,
  buildShadow,
  buildTransform,
  borderDefaults,
  clipPathDefaults,
  colorWithOpacity,
  filterDefaults,
  glassDefaults,
  gradientDefaults,
  gridDefaults,
  presetMatches,
  radiusDefaults,
  reactProperty,
  shadowPresets,
  toCss,
  toReact,
  toTailwind,
  transformDefaults,
} from '@/tools/design/css-generator/generators'

describe('CSS generator builders', () => {
  it('converts colours with opacity', () => {
    expect(colorWithOpacity('#FF0000')).toBe('#ff0000')
    expect(colorWithOpacity('#000000', 25)).toBe('rgba(0, 0, 0, 0.25)')
  })

  it('builds linear, radial, conic and text gradients', () => {
    expect(buildGradient(gradientDefaults).decls).toEqual([['background', 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)']])
    const radial = buildGradient({ ...gradientDefaults, kind: 'radial', shape: 'ellipse', x: 20, y: 80 })
    expect(radial.decls[0][1]).toBe('radial-gradient(ellipse at 20% 80%, #6366f1 0%, #ec4899 100%)')
    const conic = buildGradient({ ...gradientDefaults, kind: 'conic', angle: 90, repeating: true })
    expect(conic.decls[0][1]).toBe('repeating-conic-gradient(from 90deg at 50% 50%, #6366f1 0%, #ec4899 100%)')
    const text = buildGradient({ ...gradientDefaults, target: 'text' })
    expect(text.decls.map(([p]) => p)).toEqual(['background', '-webkit-background-clip', 'background-clip', 'color'])
  })

  it('sorts gradient stops by position', () => {
    const state = { ...gradientDefaults, stops: [{ id: 'b', color: '#ffffff', position: 80, opacity: 50 }, { id: 'a', color: '#000000', position: 10, opacity: 100 }] }
    expect(buildGradient(state).decls[0][1]).toBe('linear-gradient(135deg, #000000 10%, rgba(255, 255, 255, 0.5) 80%)')
  })

  it('stacks shadow layers and marks inset ones', () => {
    const layered = shadowPresets.find((p) => p.id === 'neumorphic')!.patch
    expect(buildShadow({ layers: layered.layers! }).decls[0][1]).toBe('8px 8px 16px 0px rgba(163, 177, 198, 0.6), -8px -8px 16px 0px rgba(255, 255, 255, 0.9)')
    const inset = shadowPresets.find((p) => p.id === 'inset')!.patch
    expect(buildShadow({ layers: inset.layers! }).decls[0][1]).toMatch(/^inset /)
    expect(buildShadow({ layers: [] }).decls[0][1]).toBe('none')
  })

  it('collapses equal radius corners and keeps per-corner values', () => {
    expect(buildRadius(radiusDefaults).decls[0][1]).toBe('16px')
    expect(buildRadius({ ...radiusDefaults, unit: '%', tl: 50, tr: 0, br: 50, bl: 0 }).decls[0][1]).toBe('50% 0% 50% 0%')
  })

  it('writes borders for the chosen sides', () => {
    expect(buildBorder({ ...borderDefaults, side: 'x', radius: 0 }).decls).toEqual([
      ['border-left', '2px solid #6366f1'],
      ['border-right', '2px solid #6366f1'],
    ])
  })

  it('adds the webkit prefix for glass backdrop filters', () => {
    const decls = Object.fromEntries(buildGlass(glassDefaults).decls)
    expect(decls['-webkit-backdrop-filter']).toBe('blur(12px) saturate(160%)')
    expect(decls.background).toBe('rgba(255, 255, 255, 0.18)')
  })

  it('only lists filters and transforms that differ from the defaults', () => {
    expect(buildFilter(filterDefaults).decls[0][1]).toBe('none')
    expect(buildFilter({ ...filterDefaults, grayscale: 100, contrast: 130 }).decls[0][1]).toBe('contrast(130%) grayscale(100%)')
    expect(buildTransform(transformDefaults).decls).toEqual([['transform', 'none']])
    expect(buildTransform({ ...transformDefaults, perspective: 800, rotateY: -18, scale: 105, origin: 'top left' }).decls).toEqual([
      ['transform', 'perspective(800px) rotateY(-18deg) scale(1.05)'],
      ['transform-origin', 'top left'],
    ])
  })

  it('builds clip paths, animations with keyframes and grids', () => {
    expect(buildClipPath(clipPathDefaults).decls[0][1]).toBe('polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)')
    expect(buildClipPath({ ...clipPathDefaults, shape: 'inset' }).decls[0][1]).toBe('inset(10% round 16px)')
    const animation = buildAnimation(animationDefaults)
    expect(animation.decls[0][1]).toBe('bounce 1000ms ease 0ms infinite normal both')
    expect(animation.extra).toMatch(/^@keyframes bounce \{/)
    expect(buildGrid({ ...gridDefaults, mode: 'auto-fit', minWidth: 120, columnGap: 8 }).decls).toEqual([
      ['display', 'grid'],
      ['grid-template-columns', 'repeat(auto-fit, minmax(120px, 1fr))'],
      ['gap', '12px 8px'],
    ])
  })

  it('formats CSS, Tailwind and React output', () => {
    const result = buildGlass({ ...glassDefaults, shadow: false })
    expect(toCss(result)).toMatch(/^\.element \{\n {2}background: rgba\(255, 255, 255, 0\.18\);/)
    expect(toTailwind(result)).toContain('[-webkit-backdrop-filter:blur(12px)_saturate(160%)]')
    expect(toReact(result)).toContain("WebkitBackdropFilter: 'blur(12px) saturate(160%)',")
    expect(reactProperty('border-top-left-radius')).toBe('borderTopLeftRadius')
    expect(toCss(buildAnimation(animationDefaults))).toContain('\n\n@keyframes bounce {')
  })

  it('recognises the preset that matches the current state', () => {
    expect(presetMatches(radiusDefaults, { tl: 16, unit: 'px' })).toBe(true)
    expect(presetMatches(radiusDefaults, { tl: 0 })).toBe(false)
  })
})

registerModules()
afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollTo ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
})

const LOAD = { timeout: 15_000 }
const code = () => document.querySelector('pre')?.textContent ?? ''

describe('CSS Generator tool', () => {
  it('applies presets, switches output formats and changes generator', async () => {
    window.location.hash = '#/tools/design/css-generator?tab=shadow'
    const user = userEvent.setup()
    render(<App />)

    const picker = await screen.findByRole('button', { name: 'Choose a CSS generator' }, LOAD)
    expect(picker).toHaveTextContent('Box shadow')
    expect(code()).toContain('box-shadow: 0px 8px 24px 0px rgba(0, 0, 0, 0.25);')

    await user.click(screen.getByRole('button', { name: 'Hard' }))
    expect(screen.getByRole('button', { name: 'Hard' })).toHaveAttribute('aria-pressed', 'true')
    expect(code()).toContain('box-shadow: 6px 6px 0px 0px #0f172a;')

    await user.click(screen.getByRole('radio', { name: 'Tailwind' }))
    expect(code()).toBe('[box-shadow:6px_6px_0px_0px_#0f172a]')

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(code()).toBe('[box-shadow:0px_8px_24px_0px_rgba(0,_0,_0,_0.25)]')

    await user.click(picker)
    await user.click(await screen.findByRole('button', { name: 'Clip path' }))
    await waitFor(() => expect(picker).toHaveTextContent('Clip path'))
    expect(code()).toContain('[clip-path:polygon(')
    await user.click(screen.getByRole('button', { name: 'Star' }))
    expect(code()).toContain('50%_0%,_61%_35%')
  }, 30_000)
})
