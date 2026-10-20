import { WHATSAPP_FEATURE_LABELS } from '@/core/sites/whatsapp/labels'

const featureStrings: Record<string, string> = {}
for (const [id, v] of Object.entries(WHATSAPP_FEATURE_LABELS)) {
  featureStrings[`sites.whatsapp.features.${id}.label`] = v.label
  featureStrings[`sites.whatsapp.features.${id}.description`] = v.description
}

export const sitesWhatsappStrings: Record<string, string> = {
  'sites.whatsapp.header.title': 'ChatBoost',
  'sites.whatsapp.header.subtitle': 'Privacy, productivity, and business tools for web.whatsapp.com',
  'sites.whatsapp.header.active': '{{count}} features active',
  'sites.whatsapp.search': 'Search options…',
  'sites.whatsapp.bestEffort': 'best effort',
  'sites.whatsapp.resetSection': 'Reset section',
  'sites.whatsapp.settings.title': 'ChatBoost for WhatsApp',
  'sites.whatsapp.settings.link': 'Open WhatsApp panel',
  'sites.whatsapp.status.no_tab': 'Open web.whatsapp.com',
  'sites.whatsapp.status.loading': 'Connecting…',
  'sites.whatsapp.status.not_logged_in': 'Log in to WhatsApp Web',
  'sites.whatsapp.status.ready': 'Connected',
  'sites.whatsapp.tabs.enhancements': 'Enhancements',
  'sites.whatsapp.tabs.business': 'Business tools',
  'sites.whatsapp.tabs.export': 'Export',
  'sites.whatsapp.tabs.utilities': 'Utilities',
  'sites.whatsapp.sections.privacy': 'Private mode',
  'sites.whatsapp.sections.custom': 'Customizations',
  'sites.whatsapp.sections.buttons': 'Extra buttons',
  'sites.whatsapp.preset.privacy': 'Privacy',
  'sites.whatsapp.preset.clean': 'Clean',
  'sites.whatsapp.preset.reset': 'Reset all',
  'sites.whatsapp.business.templates': 'Message templates',
  'sites.whatsapp.business.smartReplies': 'Smart replies',
  'sites.whatsapp.business.scheduled': 'Scheduled messages',
  'sites.whatsapp.business.tasks': 'Tasks',
  'sites.whatsapp.business.broadcast': 'Broadcasting',
  'sites.whatsapp.business.webhooks': 'Outgoing webhooks',
  'sites.whatsapp.export.contacts': 'Export contacts',
  'sites.whatsapp.export.groups': 'Export group members',
  'sites.whatsapp.export.labels': 'Export labels',
  'sites.whatsapp.export.countries': 'Export by country',
  'sites.whatsapp.utilities.clickToChat': 'Click to chat',
  'sites.whatsapp.utilities.numberCheck': 'Number checker',
  'sites.whatsapp.utilities.unavailable': 'Requires a server (not available in extension)',
  'sites.whatsapp.broadcast.warning': 'Bulk messaging may get your account restricted. Delays and daily caps are enforced.',
  ...featureStrings,
}
