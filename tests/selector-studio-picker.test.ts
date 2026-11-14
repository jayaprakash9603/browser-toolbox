import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { cancelPicker, isPickerActive, startPicker } from '@/chrome/content/elementPicker'

const PICK_KEY = 'toolbox.pickedElement'

describe('selector-studio element picker', () => {
  beforeEach(async () => {
    await chrome.storage.session.clear()
    await chrome.storage.local.clear()
  })

  afterEach(() => {
    cancelPicker()
    document.body.innerHTML = ''
    document.body.style.cursor = ''
    document.getElementById('toolbox-element-picker-overlay')?.remove()
    document.getElementById('toolbox-element-picker-label')?.remove()
  })

  it('enters crosshair mode with overlay elements', () => {
    document.body.innerHTML = '<button id="go">Go</button>'
    startPicker()
    expect(isPickerActive()).toBe(true)
    expect(document.body.style.cursor).toBe('crosshair')
    expect(document.getElementById('toolbox-element-picker-overlay')).toBeTruthy()
    expect(document.getElementById('toolbox-element-picker-label')).toBeTruthy()
  })

  it('persists a captured snapshot when the user clicks an element', async () => {
    document.body.innerHTML = '<form><button id="go" data-testid="submit">Submit</button></form>'
    startPicker()
    const button = document.getElementById('go')!
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    expect(isPickerActive()).toBe(false)
    const stored = (await chrome.storage.session.get(PICK_KEY)) as Record<string, unknown>
    const picked = stored[PICK_KEY] as { snapshot?: { tag: string; attributes: Record<string, string> } }
    expect(picked?.snapshot?.tag).toBe('button')
    expect(picked?.snapshot?.attributes['data-testid']).toBe('submit')
  })

  it('cancels on Escape without writing storage', async () => {
    document.body.innerHTML = '<button>Go</button>'
    startPicker()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(isPickerActive()).toBe(false)
    const stored = await chrome.storage.session.get(PICK_KEY)
    expect(stored[PICK_KEY]).toBeUndefined()
  })

  it('updates hover label on mousemove', () => {
    document.body.innerHTML = '<button id="hover" class="primary">Go</button>'
    startPicker()
    const button = document.getElementById('hover')!
    button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
    const label = document.getElementById('toolbox-element-picker-label')
    expect(label?.textContent).toContain('button#hover')
  })
})