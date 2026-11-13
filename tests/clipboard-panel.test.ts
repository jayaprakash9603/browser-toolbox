import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const PANEL_JS = resolve(process.cwd(), 'public/inject/clipboard-panel.js')
const source = readFileSync(PANEL_JS, 'utf8')

const panelText = {
  title: 'Clipboard',
  search: 'Search clipboard…',
  empty: 'Nothing copied yet.',
  noMatches: 'Nothing in this view yet',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  close: 'Close',
  delete: 'Delete',
  pin: 'Pin',
  unpin: 'Unpin',
  pinned: 'Pinned',
  filterAll: 'All',
  filterPinned: 'Pinned',
  filterLinks: 'Links',
  filterCode: 'Code',
  filterText: 'Text',
  filterLabel: 'Filter clipboard items',
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
  character: 'character',
  characters: 'characters',
  words: 'words',
  justNow: 'just now',
  minAgo: 'min. ago',
  hrAgo: 'hr. ago',
  hrsAgo: 'hrs. ago',
  daysAgo: 'days ago',
  showAll: 'Show all',
  showLess: 'Show less',
}

function entries(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `clip-${index}`,
    text: `Clipboard item ${index + 1}\nSecond line of sample text for overflow.`,
    createdAt: Date.now() - index * 60_000,
    pinned: index === 0,
    charCount: 48,
    wordCount: 10,
  }))
}

function mountPanel(count = 12) {
  vi.stubGlobal('chrome', {
    runtime: { sendMessage: vi.fn(() => Promise.resolve({ ok: true })) },
    storage: { onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
  })
  ;(window as Window & { __TBX_CLIPBOARD_PANEL__?: unknown }).__TBX_CLIPBOARD_PANEL__ = {
    text: panelText,
    entries: entries(count),
    storageKey: 'clipboardHistory',
  }
  window.eval(source)
  return document.getElementById('tbx-clipboard-panel-host')
}

describe('clipboard overlay inject', () => {
  afterEach(() => {
    document.getElementById('tbx-clipboard-panel-host')?.remove()
    vi.unstubAllGlobals()
  })

  it('scrolls only the copied-text list with a thin scrollbar', () => {
    expect(source).toMatch(/\.list\{[^}]*overflow-y:auto/)
    expect(source).toMatch(/\.section,\.item,\.empty\{flex:none\}/)
    expect(source).toMatch(/\.scroll-rail\{[^}]*width:4px/)
    expect(source).toMatch(/class="scroll-rail"/)
    expect(source).toMatch(/\.card\{[^}]*overflow:hidden/)
    expect(source).not.toMatch(/height:fit-content/)
  })

  it('renders history items inside the overlay card', () => {
    const host = mountPanel(9)
    expect(host).toBeTruthy()
    const card = host!.shadowRoot?.querySelector('.card') as HTMLElement
    const list = host!.shadowRoot?.querySelector('.list') as HTMLElement
    expect(card).toBeTruthy()
    expect(list.querySelectorAll('.item')).toHaveLength(9)
    expect(list.querySelectorAll('.copied-flash')).toHaveLength(9)
    expect(host!.shadowRoot?.querySelector('[role="status"]')).toBeTruthy()
    expect(card.className).toContain('card')
    expect(host!.shadowRoot?.querySelector('.chrome')).toBeTruthy()
    expect(host!.shadowRoot?.querySelector('.scroller')).toBeTruthy()
    expect(host!.shadowRoot?.querySelector('.scroll-rail')).toBeTruthy()
  })
})
