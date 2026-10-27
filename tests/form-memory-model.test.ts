import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FORM_MEMORY_STATE,
  applyCapture,
  groupMemoryByHost,
  normalizeFormMemoryState,
  pageRefFor,
  planFill,
  removeMemoryField,
  setHostBlocked,
  updateMemoryField,
  type CapturedField,
} from '@/core/form-memory/model'

const name: CapturedField = { key: 'text:name', label: 'Full name', kind: 'text', value: 'Ada', name: 'name' }
const terms: CapturedField = { key: 'checkbox:terms', label: 'I agree', kind: 'checkbox', value: true }
const country: CapturedField = { key: 'select:country', label: 'Country', kind: 'select', value: 'in', display: 'India' }

describe('form memory model', () => {
  it('keys pages by origin and path, ignoring query, hash and trailing slashes', () => {
    expect(pageRefFor('https://shop.example.com/checkout/?step=2#pay')).toMatchObject({
      id: 'https://shop.example.com/checkout',
      host: 'shop.example.com',
      path: '/checkout',
    })
    expect(pageRefFor('chrome://settings')).toBeNull()
  })

  it('remembers text, checkboxes and selects per page and forgets cleared fields', () => {
    let state = applyCapture(DEFAULT_FORM_MEMORY_STATE, { url: 'https://a.test/form', fields: [name, terms, country] }, 1)
    const page = state.pages['https://a.test/form']
    expect(Object.keys(page.fields)).toEqual(['text:name', 'checkbox:terms', 'select:country'])
    expect(page.fields['select:country'].display).toBe('India')

    state = applyCapture(state, { url: 'https://a.test/form?x=1', fields: [{ ...name, value: '' }] }, 2)
    expect(state.pages['https://a.test/form'].fields['text:name']).toBeUndefined()
    expect(state.pages['https://a.test/form'].fields['checkbox:terms'].value).toBe(true)
  })

  it('never records blocked hosts and keeps identical captures as no-ops', () => {
    const blocked = setHostBlocked(DEFAULT_FORM_MEMORY_STATE, 'a.test', true)
    expect(applyCapture(blocked, { url: 'https://a.test/form', fields: [name] }, 1)).toBe(blocked)

    const once = applyCapture(DEFAULT_FORM_MEMORY_STATE, { url: 'https://a.test/form', fields: [name] }, 1)
    expect(applyCapture(once, { url: 'https://a.test/form', fields: [name] }, 2)).toBe(once)
  })

  it('plans page values first and shares text values from other sites', () => {
    let state = applyCapture(DEFAULT_FORM_MEMORY_STATE, { url: 'https://a.test/form', fields: [name, terms] }, 1)
    state = applyCapture(state, { url: 'https://b.test/signup', fields: [{ ...name, value: 'Grace' }] }, 2)
    const plan = planFill(state, 'https://a.test/form', true)
    expect(plan.page.map((field) => field.key)).toEqual(['text:name', 'checkbox:terms'])
    expect(plan.shared.map((field) => field.value)).toEqual(['Grace'])
    expect(planFill(state, 'https://a.test/form', false).shared).toEqual([])
  })

  it('edits and removes single values, dropping pages that end up empty', () => {
    let state = applyCapture(DEFAULT_FORM_MEMORY_STATE, { url: 'https://a.test/form', fields: [name] }, 1)
    state = updateMemoryField(state, 'https://a.test/form', 'text:name', 'Ada L.', 5)
    expect(state.pages['https://a.test/form'].fields['text:name'].value).toBe('Ada L.')
    state = removeMemoryField(state, 'https://a.test/form', 'text:name')
    expect(state.pages['https://a.test/form']).toBeUndefined()
  })

  it('groups pages by host, newest first, and survives malformed storage', () => {
    let state = applyCapture(DEFAULT_FORM_MEMORY_STATE, { url: 'https://a.test/one', fields: [name] }, 1)
    state = applyCapture(state, { url: 'https://b.test/two', fields: [terms] }, 3)
    state = applyCapture(state, { url: 'https://a.test/three', fields: [country] }, 2)
    const groups = groupMemoryByHost(state)
    expect(groups.map((group) => group.host)).toEqual(['b.test', 'a.test'])
    expect(groups[1].pages.map((page) => page.path)).toEqual(['/three', '/one'])

    const restored = normalizeFormMemoryState(JSON.parse(JSON.stringify(state)))
    expect(Object.keys(restored.pages)).toHaveLength(3)
    expect(normalizeFormMemoryState({ pages: { x: { url: 'nope' } }, settings: { learn: false } })).toMatchObject({
      pages: {},
      settings: { learn: false, autoFill: false, blockedHosts: [] },
    })
  })
})
