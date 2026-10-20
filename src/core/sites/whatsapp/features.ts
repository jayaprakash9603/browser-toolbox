import type { WhatsappFeatureDef, WhatsappSection } from './types'

function toggles(
  section: WhatsappSection,
  ids: string[],
  opts?: Partial<Pick<WhatsappFeatureDef, 'impl' | 'default' | 'bestEffort'>>,
): WhatsappFeatureDef[] {
  const impl = opts?.impl ?? 'css'
  const defaultVal = opts?.default ?? false
  return ids.map((id) => ({
    id,
    section,
    kind: 'toggle',
    impl,
    default: defaultVal,
    ...(opts?.bestEffort ? { bestEffort: true } : {}),
  }))
}

export const WHATSAPP_FEATURES: WhatsappFeatureDef[] = [
  ...toggles('privacy', [
    'blurContactNames',
    'blurContactPhotos',
    'blurRecentMessages',
    'blurConversationMessages',
    'blurComposer',
  ]),
  ...toggles('privacy', [
    'hideTyping',
    'hideRecording',
    'viewStatusPrivately',
    'playAudioPrivately',
    'disableReadReceipts',
    'invisibleMode',
  ], { impl: 'script', bestEffort: true }),
  {
    id: 'restoreDeletedMessages',
    section: 'privacy',
    kind: 'toggle',
    impl: 'script',
    default: false,
  },
  ...toggles('custom', ['notifyOnline', 'notifyTyping', 'preventListJump'], { impl: 'script' }),
  {
    id: 'customChatBackground',
    section: 'custom',
    kind: 'toggle',
    impl: 'style',
    default: false,
  },
  {
    id: 'showSideLauncher',
    section: 'custom',
    kind: 'toggle',
    impl: 'script',
    default: true,
  },
  ...toggles('buttons', [
    'btnLike',
    'btnPinChat',
    'btnStartChat',
    'btnMarkRead',
    'btnTranslate',
    'btnTranscribe',
    'btnDownloadStatus',
    'btnChatInfo',
    'btnQuickReply',
    'btnAddTask',
    'btnSaveContact',
  ], { impl: 'script' }),
  {
    id: 'whisperApiKey',
    section: 'buttons',
    kind: 'text',
    impl: 'script',
    default: '',
  },
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
