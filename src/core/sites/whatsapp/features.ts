import type { WhatsappFeatureDef, WhatsappSection } from './types'

function toggles(section: WhatsappSection, ids: string[], impl: WhatsappFeatureDef['impl']): WhatsappFeatureDef[] {
  return ids.map((id) => ({ id, section, kind: 'toggle', impl, default: false }))
}

/** Only features WhatsApp Web does not already offer natively. */
export const WHATSAPP_FEATURES: WhatsappFeatureDef[] = [
  ...toggles('privacy', ['blurContactNames', 'blurContactPhotos', 'blurRecentMessages', 'blurConversationMessages', 'blurComposer'], 'css'),
  ...toggles('privacy', ['restoreDeletedMessages'], 'script'),
  { id: 'customChatBackground', section: 'custom', kind: 'toggle', impl: 'style', default: false },
  { id: 'showSideLauncher', section: 'custom', kind: 'toggle', impl: 'script', default: true },
  { id: 'chatPulse', section: 'custom', kind: 'toggle', impl: 'script', default: true },
  { id: 'btnExportChat', section: 'buttons', kind: 'toggle', impl: 'script', default: true },
  ...toggles('buttons', ['btnStartChat', 'btnTranslate', 'btnQuickReply', 'btnAddTask'], 'script'),
]

export const WHATSAPP_FEATURE_BY_ID = new Map(WHATSAPP_FEATURES.map((f) => [f.id, f]))
export const CSS_FEATURE_IDS = WHATSAPP_FEATURES.filter((f) => f.impl === 'css').map((f) => f.id)
export const SCRIPT_FEATURE_IDS = WHATSAPP_FEATURES.filter((f) => f.impl === 'script').map((f) => f.id)

export function featureLabelKey(id: string): string {
  return `sites.whatsapp.features.${id}.label`
}

export function featureDescKey(id: string): string {
  return `sites.whatsapp.features.${id}.description`
}

export function sectionLabelKey(section: WhatsappSection): string {
  return `sites.whatsapp.sections.${section}`
}
