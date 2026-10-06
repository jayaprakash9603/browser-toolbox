import { describe, expect, it } from 'vitest'

import { registerModules } from '@/modules'
import { categoryRegistry, toolRegistry } from '@/core/registry'

describe('tool registry', () => {
  registerModules()

  it('registers all 11 phase-1 tools', () => {
    expect(toolRegistry.getAll()).toHaveLength(11)
  })

  it('rejects duplicate tool ids', () => {
    const tool = toolRegistry.get('text.word-counter')!
    expect(() => toolRegistry.register(tool)).toThrow(/Duplicate tool id/)
  })

  it('every tool route is unique and resolvable', () => {
    const routes = toolRegistry.getAll().map((t) => t.route)
    expect(new Set(routes).size).toBe(routes.length)
    routes.forEach((route) => expect(route).toMatch(/^\/tools\/[\w-]+\/[\w-]+$/))
  })

  it('search matches name, keywords and category', () => {
    expect(toolRegistry.search('json')).toEqual([
      expect.objectContaining({ id: 'text.formatter' }),
    ])
    expect(toolRegistry.search('word')).toContainEqual(
      expect.objectContaining({ id: 'text.word-counter' }),
    )
    expect(toolRegistry.search('clipboard')).toEqual([
      expect.objectContaining({ id: 'clipboard.manager' }),
    ])
    expect(toolRegistry.search('formatter')).toEqual([
      expect.objectContaining({ id: 'text.formatter', name: 'Formatter' }),
    ])
    expect(toolRegistry.search('camel snake')).toContainEqual(
      expect.objectContaining({ id: 'text.case-converter' }),
    )
  })
})

describe('category registry', () => {
  it('has clipboard and text enabled, others coming soon', () => {
    const enabled = categoryRegistry.getEnabled().map((c) => c.id)
    expect(enabled).toEqual(['clipboard', 'text'])
    expect(categoryRegistry.getAll().length).toBeGreaterThanOrEqual(10)
  })

  it('sorts categories by order', () => {
    const orders = categoryRegistry.getAll().map((c) => c.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
