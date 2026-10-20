import type { ChatPulseReport } from '@/core/sites/whatsapp/analytics'

import { progressBars, svgBarChart, svgDonut, svgDualBar, svgGauge, svgHeatGrid } from './charts'

type Child = Node | string | null | undefined | false

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue
    node.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return node
}

function panel(title: string, body: Child, wide = false): HTMLElement {
  return el('section', `tbx-cp-panel${wide ? ' tbx-cp-panel--wide' : ''}`, el('h3', 'tbx-cp-panel__title', title), el('div', 'tbx-cp-panel__body', body))
}

function kpi(label: string, value: string | number): HTMLElement {
  return el('div', 'tbx-cp-kpi', el('span', 'tbx-cp-kpi__val', String(value)), el('span', 'tbx-cp-kpi__label', label))
}

function notEnough(): HTMLElement {
  return el('p', 'tbx-cp-muted', 'Not enough data')
}

function optionalBlock(title: string, value: number | null): HTMLElement {
  if (value == null) return panel(title, notEnough())
  return panel(title, el('p', 'tbx-cp-stat', String(value)))
}

export function renderPanels(report: ChatPulseReport, worldMapSvg?: string): HTMLElement {
  const grid = el('div', 'tbx-cp-grid')
  const k = report.kpis

  const kpiRow1 = el(
    'div',
    'tbx-cp-kpis',
    kpi('Total messages', k.totalMessages),
    kpi('Sent', k.sent),
    kpi('Received', k.received),
    kpi('Chats', k.chats),
    kpi('Groups', k.groups),
    kpi('Avg / day', k.avgPerDay),
    kpi('Avg response (min)', k.avgResponseMin),
    kpi('Media %', k.mediaRatio),
  )
  const kpiRow2 = el(
    'div',
    'tbx-cp-kpis',
    kpi('Links', k.links),
    kpi('Unread chats', k.unreadChats),
    kpi('Unread msgs', k.unreadMessages),
    kpi('Words', k.totalWords),
    kpi('Contacts', k.contacts),
    kpi('Blocked', k.blocked),
    kpi('Labels', k.labels),
    kpi('Stickers', k.stickers),
  )
  grid.append(kpiRow1, kpiRow2)

  const daily = report.dailyActivity.slice(-14)
  grid.append(
    panel('Daily activity', daily.length ? svgDualBar(daily) : notEnough(), true),
    panel('Sent vs received', svgDonut(report.sentVsReceived.sent, report.sentVsReceived.received)),
    panel('Activity by hour', svgHeatGrid(report.hourlyActivity, 24, 12)),
    panel('Activity by weekday', svgBarChart(
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => ({
        label,
        value: report.weekdayActivity[i] ?? 0,
      })),
    )),
    panel('Monthly volume', report.monthlyVolume.length ? svgBarChart(report.monthlyVolume.slice(-12)) : notEnough()),
    panel('Message types', report.messageTypes.length ? progressBars(report.messageTypes) : notEnough()),
    panel('Most active conversations', report.topConversations.length ? progressBars(report.topConversations) : notEnough()),
    panel('Top groups', report.topGroups.length ? progressBars(report.topGroups) : notEnough()),
    panel('Top DMs', report.topDms.length ? progressBars(report.topDms) : notEnough()),
    panel('Top group senders', report.topGroupSenders.length ? progressBars(report.topGroupSenders) : notEnough()),
    panel('Longest silences (days)', report.longestSilences.length ? progressBars(report.longestSilences) : notEnough()),
    panel('Most unread', report.mostUnread.length ? progressBars(report.mostUnread) : notEnough()),
    panel(
      'Response time',
      el(
        'div',
        'tbx-cp-response',
        svgGauge(report.responseTime.medianMin, Math.max(60, report.responseTime.slowestMin)),
        el(
          'ul',
          'tbx-cp-list',
          el('li', '', `Median: ${report.responseTime.medianMin} min`),
          el('li', '', `Fastest: ${report.responseTime.fastestMin} min`),
          el('li', '', `Slowest: ${report.responseTime.slowestMin} min`),
        ),
      ),
    ),
    panel('Read but not replied (est.)', el('p', 'tbx-cp-stat', String(report.readNotReplied))),
    panel('Activity streaks', el('p', 'tbx-cp-stat', `Current ${report.streaks.current} days · Longest ${report.streaks.longest} days`)),
    panel('Account overview', el(
      'ul',
      'tbx-cp-list',
      el('li', '', `First: ${report.account.firstMessageAt.slice(0, 10) || '—'}`),
      el('li', '', `Last: ${report.account.lastMessageAt.slice(0, 10) || '—'}`),
      el('li', '', `Avg length: ${report.account.avgMessageLength} chars`),
      el('li', '', `Total words: ${report.account.totalWords}`),
    )),
    panel('Top words', report.topWords.length ? progressBars(report.topWords) : notEnough()),
    panel('Top emojis', report.topEmojis.length ? progressBars(report.topEmojis) : notEnough()),
    panel('Night replies', el('p', 'tbx-cp-stat', String(report.nightReplies))),
    panel('Delayed replies', el('p', 'tbx-cp-stat', String(report.delayedReplies))),
    panel('Unanswered (est.)', el('p', 'tbx-cp-stat', String(report.unanswered))),
    panel('Conversation starters', report.conversationStarters.length ? progressBars(report.conversationStarters) : notEnough()),
  )

  const countriesBody = el('div', 'tbx-cp-countries')
  if (report.countries.length) {
    countriesBody.append(progressBars(report.countries.map((c) => ({ label: c.country, value: c.count }))))
    if (worldMapSvg) {
      const mapWrap = el('div', 'tbx-cp-map')
      mapWrap.innerHTML = worldMapSvg
      countriesBody.appendChild(mapWrap)
    }
  } else {
    countriesBody.append(notEnough())
  }
  grid.append(panel('Top countries', countriesBody, true))

  const opt = report.optional
  grid.append(
    optionalBlock('Channels', opt.channels),
    optionalBlock('Status', opt.statusPosts),
    optionalBlock('Communities', opt.communities),
    optionalBlock('Calls', opt.calls),
    optionalBlock('Catalog', opt.catalogProducts),
    optionalBlock('Orders', opt.orders),
  )

  return grid
}
