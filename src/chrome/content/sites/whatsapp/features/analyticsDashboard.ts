import {
  computeReport,
  type AnalyticsRange,
  type AnalyticsRangePreset,
  type ChatPulseReport,
} from '@/core/sites/whatsapp/analytics'

import { renderPanels } from '../analytics/panels'
import { analyticsMain } from '../bridge'

const ROOT_ID = 'tbx-chatpulse-root'
const PRESETS: AnalyticsRangePreset[] = ['7d', '30d', '90d', '1y', 'all']

let currentRange: AnalyticsRange = '30d'
let report: ChatPulseReport | null = null
let worldMapCache: string | null = null

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
  for (const row of r.topConversations) lines.push(`top_chat,${row.label},${row.value}`)
  return lines.join('\n')
}

async function loadWorldMap(highlightCodes: string[]): Promise<string> {
  try {
    const url = chrome.runtime.getURL('sites/whatsapp/world-map.json')
    const res = await fetch(url)
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

export function closeAnalyticsDashboard(): void {
  document.getElementById(ROOT_ID)?.remove()
}

export function openAnalyticsDashboard(): void {
  closeAnalyticsDashboard()
  const root = el('div', 'tbx-cp-root')
  root.id = ROOT_ID

  const subtitle = el('p', 'tbx-cp-subtitle', 'Loading…')
  const content = el('div', 'tbx-cp-content')

  const chipRow = el('div', 'tbx-cp-chips')
  const fromInput = el('input', 'tbx-cp-date')
  fromInput.type = 'date'
  const toInput = el('input', 'tbx-cp-date')
  toInput.type = 'date'

  const setRange = (range: AnalyticsRange) => {
    currentRange = range
    for (const btn of chipRow.querySelectorAll('button')) {
      btn.classList.toggle('is-active', btn.dataset.range === (typeof range === 'string' ? range : 'custom'))
    }
  }

  for (const preset of PRESETS) {
    const label = preset === 'all' ? 'All' : preset
    const btn = el('button', 'tbx-cp-chip', label)
    btn.type = 'button'
    btn.dataset.range = preset
    btn.textContent = label
    btn.addEventListener('click', () => {
      setRange(preset)
      void runLoad()
    })
    chipRow.appendChild(btn)
  }

  const refresh = () => void runLoad()

  const header = el(
    'header',
    'tbx-cp-header',
    el('div', 'tbx-cp-header__title', el('h1', '', 'ChatPulse Analytics'), el('span', 'tbx-cp-beta', 'BETA')),
    el(
      'div',
      'tbx-cp-toolbar',
      chipRow,
      fromInput,
      toInput,
      el('button', 'tbx-cp-btn', 'Refresh'),
      el('button', 'tbx-cp-btn', 'Export JSON'),
      el('button', 'tbx-cp-btn', 'Export CSV'),
      el('button', 'tbx-cp-btn tbx-cp-btn--ghost', 'Close'),
    ),
    subtitle,
  )

  const [refreshBtn, jsonBtn, csvBtn, closeBtn] = header.querySelectorAll('button')
  refreshBtn.addEventListener('click', () => {
    if (fromInput.value && toInput.value) setRange({ from: fromInput.value, to: toInput.value })
    refresh()
  })
  jsonBtn.addEventListener('click', () => {
    if (!report) return
    download(`chatpulse-${Date.now()}.json`, 'application/json', JSON.stringify(report, null, 2))
  })
  csvBtn.addEventListener('click', () => {
    if (!report) return
    download(`chatpulse-${Date.now()}.csv`, 'text/csv', reportToCsv(report))
  })
  closeBtn.addEventListener('click', () => closeAnalyticsDashboard())

  root.append(header, content)
  document.body.appendChild(root)
  root.addEventListener('click', (e) => {
    if (e.target === root) closeAnalyticsDashboard()
  })

  setRange(currentRange)
  void runLoad()

  async function runLoad() {
    subtitle.textContent = 'Collecting messages…'
    content.replaceChildren(el('div', 'tbx-cp-loading', 'Analyzing chats…'))
    const dataset = await analyticsMain(currentRange, (msg) => {
      subtitle.textContent = msg
    })
    if (!dataset) {
      subtitle.textContent = 'Could not load data. Is WhatsApp ready?'
      content.replaceChildren(el('p', 'tbx-cp-muted', 'Try refreshing WhatsApp Web and open ChatPulse again.'))
      return
    }
    report = computeReport(dataset, currentRange)
    subtitle.textContent = `Analyzed ${report.meta.messageCount} messages across ${report.meta.chatCount} chats · ${report.meta.rangeLabel}`
    if (!worldMapCache) {
      worldMapCache = await loadWorldMap(report.countries.map((c) => c.iso2).filter(Boolean))
    }
    content.replaceChildren(renderPanels(report, worldMapCache || undefined))
  }
}
