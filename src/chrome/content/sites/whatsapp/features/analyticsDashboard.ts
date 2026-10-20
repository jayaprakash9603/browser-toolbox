import {
  computeReport,
  resolveRangeMs,
  type AnalyticsRange,
  type AnalyticsRangePreset,
  type ChatPulseReport,
  type RawDataset,
} from '@/core/sites/whatsapp/analytics'

import { renderPanels } from '../analytics/panels'
import { analyticsMain } from '../bridge'

const ROOT_ID = 'tbx-chatpulse-root'
const PRESETS: AnalyticsRangePreset[] = ['7d', '30d', '90d', '1y', 'all']
const CLOSE_ICON = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'

let currentRange: AnalyticsRange = '30d'
let report: ChatPulseReport | null = null
let worldMapCache: string | null = null
let cached: { dataset: RawDataset; fromMs: number | null } | null = null
let loadSeq = 0
let escHandler: ((e: KeyboardEvent) => void) | null = null

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  for (const c of children) {
    if (c == null || c === false) continue
    node.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return node
}

function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

function closeIconButton(): HTMLButtonElement {
  const b = el('button', 'tbx-cp-x')
  b.type = 'button'
  b.title = 'Close'
  b.setAttribute('aria-label', 'Close ChatPulse Analytics')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', CLOSE_ICON)
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  b.appendChild(svg)
  b.addEventListener('click', closeAnalyticsDashboard)
  return b
}

function download(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function reportToCsv(r: ChatPulseReport): string {
  const lines = ['section,key,value']
  for (const [key, value] of Object.entries(r.kpis)) lines.push(`kpi,${key},${value}`)
  for (const row of r.topConversations) lines.push(`top_chat,"${row.label.replace(/"/g, '""')}",${row.value}`)
  return lines.join('\n')
}

async function loadWorldMap(highlightCodes: string[]): Promise<string> {
  try {
    const res = await fetch(chrome.runtime.getURL('sites/whatsapp/world-map.json'))
    if (!res.ok) return ''
    const data = (await res.json()) as { paths: Record<string, string> }
    const set = new Set(highlightCodes.map((c) => c.toUpperCase()))
    const parts: string[] = []
    for (const [iso, d] of Object.entries(data.paths ?? {})) {
      const fill = set.has(iso) ? '#25d366' : 'rgba(128,128,128,0.2)'
      parts.push(`<path d="${d}" fill="${fill}" data-iso="${iso}"/>`)
    }
    return `<svg class="tbx-cp-world" viewBox="0 0 960 500" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`
  } catch {
    return ''
  }
}

/** A cached collection can serve any range that starts at or after its own start. */
function cacheCovers(range: AnalyticsRange): boolean {
  if (!cached) return false
  if (cached.fromMs == null) return true
  const { fromMs } = resolveRangeMs(range)
  return fromMs != null && fromMs >= cached.fromMs
}

export function closeAnalyticsDashboard(): void {
  loadSeq++
  document.getElementById(ROOT_ID)?.remove()
  if (escHandler) document.removeEventListener('keydown', escHandler, true)
  escHandler = null
}

export function openAnalyticsDashboard(): void {
  closeAnalyticsDashboard()
  const root = el('div', 'tbx-cp-root')
  root.id = ROOT_ID
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'ChatPulse Analytics')

  const subtitle = el('p', 'tbx-cp-subtitle', 'Loading…')
  const content = el('div', 'tbx-cp-content')
  const chipRow = el('div', 'tbx-cp-chips')
  const fromInput = el('input', 'tbx-cp-date')
  fromInput.type = 'date'
  const toInput = el('input', 'tbx-cp-date')
  toInput.type = 'date'

  const setRange = (range: AnalyticsRange) => {
    currentRange = range
    const key = typeof range === 'string' ? range : 'custom'
    for (const btn of chipRow.querySelectorAll('button')) btn.classList.toggle('is-active', btn.dataset.range === key)
  }

  for (const preset of PRESETS) {
    const btn = button(preset === 'all' ? 'All' : preset, 'tbx-cp-chip', () => {
      setRange(preset)
      void runLoad(false)
    })
    btn.dataset.range = preset
    chipRow.appendChild(btn)
  }

  const header = el(
    'header',
    'tbx-cp-header',
    el(
      'div',
      'tbx-cp-header__top',
      el('div', 'tbx-cp-header__title', el('h1', '', 'ChatPulse Analytics'), el('span', 'tbx-cp-beta', 'BETA')),
      closeIconButton(),
    ),
    el(
      'div',
      'tbx-cp-toolbar',
      chipRow,
      fromInput,
      toInput,
      button('Refresh', 'tbx-cp-btn', () => {
        if (fromInput.value && toInput.value) setRange({ from: fromInput.value, to: toInput.value })
        void runLoad(true)
      }),
      button('Export JSON', 'tbx-cp-btn', () => {
        if (report) download(`chatpulse-${Date.now()}.json`, 'application/json', JSON.stringify(report, null, 2))
      }),
      button('Export CSV', 'tbx-cp-btn', () => {
        if (report) download(`chatpulse-${Date.now()}.csv`, 'text/csv', reportToCsv(report))
      }),
      button('Close', 'tbx-cp-btn tbx-cp-btn--ghost', closeAnalyticsDashboard),
    ),
    subtitle,
  )

  const box = el('div', 'tbx-cp-box', header, content)
  root.appendChild(box)
  root.addEventListener('click', (e) => {
    if (e.target === root) closeAnalyticsDashboard()
  })
  escHandler = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    closeAnalyticsDashboard()
  }
  document.addEventListener('keydown', escHandler, true)
  document.body.appendChild(root)

  setRange(currentRange)
  void runLoad(false)

  async function render(dataset: RawDataset) {
    report = computeReport(dataset, currentRange)
    subtitle.textContent = `Analyzed ${report.meta.messageCount} messages across ${report.meta.chatCount} chats · ${report.meta.rangeLabel}`
    content.replaceChildren(renderPanels(report, worldMapCache || undefined))
    if (worldMapCache == null) {
      worldMapCache = await loadWorldMap(report.countries.map((c) => c.iso2).filter(Boolean))
      if (worldMapCache && document.getElementById(ROOT_ID)) content.replaceChildren(renderPanels(report, worldMapCache))
    }
  }

  async function runLoad(force: boolean) {
    const seq = ++loadSeq
    if (!force && cached && cacheCovers(currentRange)) {
      await render(cached.dataset)
      return
    }
    subtitle.textContent = 'Collecting messages…'
    content.replaceChildren(el('div', 'tbx-cp-loading', el('span', 'tbx-cp-spinner'), 'Analyzing chats…'))
    const range = currentRange
    const dataset = await analyticsMain(range, (msg) => {
      if (seq === loadSeq) subtitle.textContent = msg
    })
    if (seq !== loadSeq) return
    if (!dataset) {
      subtitle.textContent = 'Could not load data. Is WhatsApp ready?'
      content.replaceChildren(el('p', 'tbx-cp-muted', 'Try again in a moment, or reload WhatsApp Web.'))
      return
    }
    cached = { dataset, fromMs: resolveRangeMs(range).fromMs }
    await render(dataset)
  }
}
