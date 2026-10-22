import { beforeEach, describe, expect, it } from 'vitest'

import { buildMenuItems } from '@/chrome/context-menu/menuTree'
import { getCommand, GLOBAL_TOOLBOX_COMMANDS, TOOLBOX_COMMANDS } from '@/core/commands'
import { isExtensionMessage } from '@/core/messaging/types'
import { clearStalePayloads, consumePayload, peekPayload, stashPayload } from '@/core/payloads'
import type { ToolDefinition } from '@/core/registry'
import { resetChromeMockStorage } from './setup'

function fakeTool(partial: Partial<ToolDefinition> & { id: string }): ToolDefinition {
  return {
    name: partial.id,
    description: '',
    category: 'developer',
    icon: (() => null) as unknown as ToolDefinition['icon'],
    keywords: [],
    route: `/tools/x/${partial.id}`,
    capabilities: ['SIDE_PANEL'],
    status: 'active',
    loader: () => Promise.resolve({ default: () => null }),
    ...partial,
  }
}

describe('context menu tree', () => {
  const tools = [
    fakeTool({
      id: 'text.analyzer',
      category: 'text',
      capabilities: ['SIDE_PANEL', 'CONTEXT_MENU'],
    }),
    fakeTool({
      id: 'developer.json-toolkit',
      category: 'developer',
      capabilities: ['SIDE_PANEL', 'CONTEXT_MENU'],
    }),
    fakeTool({
      id: 'developer.coming',
      category: 'developer',
      status: 'coming-soon',
      capabilities: ['CONTEXT_MENU'],
    }),
    fakeTool({ id: 'panel-only', category: 'developer', capabilities: ['SIDE_PANEL'] }),
  ]

  it('builds a single root with grouped children', () => {
    const items = buildMenuItems(tools)
    expect(items.filter((item) => item.id === 'toolbox.root')).toHaveLength(1)
    expect(items.some((item) => item.id.startsWith('toolbox.group.'))).toBe(true)
  })

  it('only surfaces active tools that declare CONTEXT_MENU', () => {
    const items = buildMenuItems(tools)
    const ids = items.map((item) => item.id)
    expect(ids).toContain('toolbox.tool.text.analyzer.selection')
    expect(ids).toContain('toolbox.tool.developer.json-toolkit.page')
    expect(ids.some((id) => id.includes('coming'))).toBe(false)
    expect(ids.some((id) => id.includes('panel-only'))).toBe(false)
  })

  it('scopes selection tools to the selection context only', () => {
    const items = buildMenuItems(tools)
    const analyzer = items.find((item) => item.id === 'toolbox.tool.text.analyzer.selection')!
    expect(analyzer.contexts).toEqual(['selection'])
  })

  it('includes an Open Side Panel entry per surface', () => {
    const items = buildMenuItems(tools)
    for (const surface of ['selection', 'link', 'image', 'page']) {
      expect(items.some((item) => item.id === `toolbox.open.${surface}`)).toBe(true)
    }
  })
})

describe('command registry', () => {
  it('defines global commands with default bindings in the registry', () => {
    expect(GLOBAL_TOOLBOX_COMMANDS.map((command) => command.id)).toEqual([
      'open-command-palette',
      'pick-element',
      'capture-screenshot',
      'capture-entire',
      'capture-visible',
      'capture-selection',
      'capture-element',
      'capture-menu',
      'toggle-pip',
      'toggle-recording',
    ])
    expect(GLOBAL_TOOLBOX_COMMANDS.every((command) => command.binding.default)).toBe(true)
    expect(getCommand('pick-element')?.binding.mac).toBe('Command+Shift+E')
    expect(getCommand('nope')).toBeUndefined()
    expect(TOOLBOX_COMMANDS.some((c) => c.id === 'panel-search')).toBe(true)
  })
})

describe('message validation', () => {
  it('accepts known message types with required fields', () => {
    expect(isExtensionMessage({ type: 'PICK_ELEMENT_START' })).toBe(true)
    expect(isExtensionMessage({ type: 'OPEN_TOOL', toolId: 'text.analyzer' })).toBe(true)
    expect(isExtensionMessage({ type: 'GET_PAGE_INFO' })).toBe(true)
    expect(isExtensionMessage({ type: 'GET_SEO_DATA' })).toBe(true)
    expect(isExtensionMessage({ type: 'SEO_HIGHLIGHT', kind: 'headings' })).toBe(true)
  })

  it('rejects unknown types and malformed values', () => {
    expect(isExtensionMessage({ type: 'EVAL_THIS' })).toBe(false)
    expect(isExtensionMessage({})).toBe(false)
    expect(isExtensionMessage(null)).toBe(false)
    expect(isExtensionMessage('OPEN_TOOL')).toBe(false)
  })
})

describe('payload store', () => {
  beforeEach(() => resetChromeMockStorage())

  it('stashes and consumes a payload exactly once', async () => {
    expect(await stashPayload({ toolId: 'text.analyzer', text: 'hello' })).toBe(true)
    const peeked = await peekPayload('text.analyzer')
    expect(peeked?.text).toBe('hello')
    const consumed = await consumePayload('text.analyzer')
    expect(consumed?.toolId).toBe('text.analyzer')
    expect(await consumePayload('text.analyzer')).toBeNull()
  })

  it('returns null for unknown tools', async () => {
    expect(await consumePayload('missing.tool')).toBeNull()
  })

  it('drops stale payloads', async () => {
    await stashPayload({ toolId: 'text.diff', text: 'old' })
    const area = chrome.storage.session ?? chrome.storage.local
    const key = 'toolbox.payload.text.diff'
    const stored = (await area.get(key)) as Record<string, { createdAt: number }>
    stored[key].createdAt = Date.now() - 10 * 60 * 1000
    await area.set(stored)
    expect(await consumePayload('text.diff')).toBeNull()
    await stashPayload({ toolId: 'text.diff', text: 'old2' })
    const again = (await area.get(key)) as Record<string, { createdAt: number }>
    again[key].createdAt = Date.now() - 10 * 60 * 1000
    await area.set(again)
    await clearStalePayloads()
    expect((await area.get(key))[key]).toBeUndefined()
  })
})
