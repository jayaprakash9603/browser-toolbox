import type { ToolSearchEntry } from '@/core/registry'

import { featureLabelKey, sectionLabelKey, WHATSAPP_FEATURES } from './features'
import type { WhatsappSection } from './types'

const SECTION_ORDER: WhatsappSection[] = ['privacy', 'custom', 'buttons']

function titleFromId(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export function getWhatsappSearchEntries(): ToolSearchEntry[] {
  const entries: ToolSearchEntry[] = []

  for (const tab of ['enhancements', 'business', 'export', 'utilities'] as const) {
    entries.push({
      id: `tab-${tab}`,
      labelKey: `sites.whatsapp.tabs.${tab}`,
      fallbackLabel: tab,
      keywords: ['whatsapp', tab],
      params: { tab },
    })
  }

  for (const section of SECTION_ORDER) {
    entries.push({
      id: `section-${section}`,
      labelKey: sectionLabelKey(section),
      fallbackLabel: titleFromId(section),
      keywords: [section, 'whatsapp'],
      params: { tab: 'enhancements', focus: `section-${section}` },
    })
  }

  for (const preset of ['privacy', 'clean'] as const) {
    entries.push({
      id: `preset-${preset}`,
      labelKey: `sites.whatsapp.preset.${preset}`,
      fallbackLabel: preset,
      keywords: ['preset', 'whatsapp'],
      params: { focus: `preset-${preset}` },
    })
  }

  for (const feature of WHATSAPP_FEATURES) {
    const labelWords = titleFromId(feature.id).toLowerCase()
    entries.push({
      id: feature.id,
      labelKey: featureLabelKey(feature.id),
      fallbackLabel: titleFromId(feature.id),
      keywords: [feature.section, 'whatsapp', labelWords],
      aliases: [`whatsapp ${labelWords}`],
      params: { tab: 'enhancements', focus: feature.id, section: feature.section },
    })
  }

  entries.push(
    {
      id: 'templates',
      labelKey: 'sites.whatsapp.business.templates',
      fallbackLabel: 'Message templates',
      keywords: ['whatsapp', 'template'],
      params: { tab: 'business', focus: 'templates' },
    },
    {
      id: 'broadcast',
      labelKey: 'sites.whatsapp.business.broadcast',
      fallbackLabel: 'Broadcasting',
      keywords: ['whatsapp', 'broadcast'],
      params: { tab: 'business', focus: 'broadcast' },
    },
    {
      id: 'webhooks',
      labelKey: 'sites.whatsapp.business.webhooks',
      fallbackLabel: 'Webhooks',
      keywords: ['whatsapp', 'webhook'],
      params: { tab: 'business', focus: 'webhooks' },
    },
    {
      id: 'clickToChat',
      labelKey: 'sites.whatsapp.utilities.clickToChat',
      fallbackLabel: 'Click to chat',
      keywords: ['whatsapp', 'wa.me'],
      params: { tab: 'utilities', focus: 'clickToChat' },
    },
  )

  return entries
}
