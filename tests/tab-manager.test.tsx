import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import TabManagerTool from '@/tools/productivity/tab-manager/Tool'
import {
  domainOf,
  duplicateIds,
  exportTabs,
  filterCounts,
  formatTabs,
  groupTabs,
  parseUrlList,
  pathOf,
  sortTabs,
  toTabInfo,
  type TabInfo,
} from '@/tools/productivity/tab-manager/tabModel'
import { resetChromeMockStorage } from './setup'

registerModules()

function rawTab(id: number, url: string, extra: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id,
    windowId: 1,
    index: id,
    url,
    title: `Tab ${id}`,
    active: false,
    pinned: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    frozen: false,
    ...extra,
  } as chrome.tabs.Tab
}

const info = (id: number, url: string, extra: Partial<chrome.tabs.Tab> = {}) => toTabInfo(rawTab(id, url, extra))!

describe('tab model', () => {
  it('derives readable domains and paths', () => {
    expect(domainOf('https://www.youtube.com/watch?v=1')).toBe('youtube.com')
    expect(domainOf('chrome://extensions/')).toBe('chrome://extensions')
    expect(pathOf('https://quickcalci.com/contact')).toBe('/contact')
    expect(pathOf('https://a.com/')).toBe('')
  })

  it('flags duplicates ignoring #fragments and keeps the active one', () => {
    const tabs = [info(1, 'https://a.com/x#top'), info(2, 'https://a.com/x', { active: true }), info(3, 'https://b.com')]
    expect([...duplicateIds(tabs)]).toEqual([1])
  })

  it('counts filters', () => {
    const tabs = [
      info(1, 'https://a.com', { pinned: true }),
      info(2, 'https://a.com', { audible: true, windowId: 2 }),
      info(3, 'https://c.com', { discarded: true }),
    ]
    const counts = filterCounts(tabs, { windowId: 1, dupes: duplicateIds(tabs) })
    expect(counts).toEqual({ all: 3, window: 2, pinned: 1, audio: 1, duplicates: 1, sleeping: 1 })
  })

  it('groups by domain (largest first) and by window order', () => {
    const tabs = [info(1, 'https://b.com'), info(2, 'https://a.com', { windowId: 2 }), info(3, 'https://a.com/2')]
    expect(groupTabs(tabs, 'domain', []).map((g) => [g.label, g.tabs.length])).toEqual([
      ['a.com', 2],
      ['b.com', 1],
    ])
    expect(groupTabs(tabs, 'window', [2, 1]).map((g) => g.windowId)).toEqual([2, 1])
  })

  it('sorts by recency and title', () => {
    const tabs = [info(1, 'https://a.com', { title: 'zeta', lastAccessed: 1 } as Partial<chrome.tabs.Tab>), info(2, 'https://b.com', { title: 'Alpha', lastAccessed: 9 } as Partial<chrome.tabs.Tab>)]
    expect(sortTabs(tabs, 'recent').map((t) => t.id)).toEqual([2, 1])
    expect(sortTabs(tabs, 'title').map((t) => t.id)).toEqual([2, 1])
  })

  it('formats copies and exports', () => {
    const tabs: TabInfo[] = [info(1, 'https://a.com', { title: 'A, "quoted" [x]' })]
    expect(formatTabs(tabs, 'markdown')).toBe('- [A, "quoted" \\[x\\]](https://a.com)')
    expect(formatTabs(tabs, 'csv')).toBe('title,url,domain\n"A, ""quoted"" [x]",https://a.com,a.com')
    expect(exportTabs(tabs, 'html').text).toContain('<DT><A HREF="https://a.com"')
    expect(JSON.parse(exportTabs(tabs, 'json').text).tabs[0].url).toBe('https://a.com')
  })

  it('parses pasted URL lists', () => {
    expect(parseUrlList('https://a.com\n- [B](https://b.com/x)\nexample.org\nnot a url\nchrome://settings')).toEqual([
      'https://a.com/',
      'https://b.com/x',
      'https://example.org/',
      'chrome://settings',
    ])
  })
})

const tabsApi = chrome.tabs as unknown as Record<string, ReturnType<typeof vi.fn>>
let openTabs: chrome.tabs.Tab[] = []

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <TabManagerTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  resetChromeMockStorage()
  openTabs = [
    rawTab(1, 'https://www.youtube.com/watch?v=1', { title: 'LEO lyric video', active: true, audible: true }),
    rawTab(2, 'https://quickcalci.com/contact', { title: 'Contact Quick Calci' }),
    rawTab(3, 'https://quickcalci.com/contact', { title: 'Contact Quick Calci' }),
    rawTab(4, 'https://www.instagram.com/reels/x/', { title: 'Instagram', pinned: true }),
  ]
  tabsApi.query = vi.fn(async () => openTabs)
  tabsApi.remove = vi.fn(async (ids: number | number[]) => {
    const drop = new Set(Array.isArray(ids) ? ids : [ids])
    openTabs = openTabs.filter((tab) => !drop.has(tab.id!))
  })
  tabsApi.create = vi.fn(async (props: chrome.tabs.CreateProperties) => {
    openTabs = [...openTabs, rawTab(100 + openTabs.length, props.url!, { title: 'Restored' })]
  })
  tabsApi.update = vi.fn(async () => undefined)
  ;(chrome.windows as unknown as Record<string, unknown>).getCurrent = vi.fn(async () => ({ id: 1 }))
})

afterEach(() => {
  cleanup()
})

describe('Tab Manager tool', { timeout: 20_000 }, () => {
  it('shows tabs with domain, badges and filter counts', async () => {
    renderTool()
    expect(await screen.findByText('LEO lyric video')).toBeInTheDocument()
    expect(screen.getAllByText('quickcalci.com')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: /Duplicates\s*1/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Pinned\s*1/ })).toBeInTheDocument()
    expect(screen.getByText('4 tabs in 1 window(s) · 1 duplicate')).toBeInTheDocument()
  })

  it('filters to duplicates and searches', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('tab', { name: /Duplicates/ }))
    expect(screen.queryByText('LEO lyric video')).not.toBeInTheDocument()
    expect(screen.getAllByText('Contact Quick Calci')).toHaveLength(1)
    await user.click(screen.getByRole('tab', { name: /All/ }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'insta' } })
    expect(screen.getByText('Instagram')).toBeInTheDocument()
    expect(screen.queryByText('LEO lyric video')).not.toBeInTheDocument()
  })

  it('closes a tab and undoes it', async () => {
    const user = userEvent.setup()
    renderTool()
    const row = (await screen.findByText('Instagram')).closest('li')!
    await user.click(within(row).getByRole('button', { name: 'Close tab' }))
    expect(tabsApi.remove).toHaveBeenCalledWith([4])
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() =>
      expect(tabsApi.create).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://www.instagram.com/reels/x/', pinned: true })),
    )
  })

  it('bulk-selects tabs and closes them', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('button', { name: 'Select tabs' }))
    await user.click(screen.getAllByRole('checkbox', { name: 'Select Contact Quick Calci' })[0])
    await user.click(screen.getByRole('checkbox', { name: 'Select Instagram' }))
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(tabsApi.remove).toHaveBeenCalledWith(expect.arrayContaining([4]))
    expect(await screen.findByText('Closed 2 tabs')).toBeInTheDocument()
  })
})
