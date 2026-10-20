import type { WhatsappFeatureValue } from './types'

export type WhatsappPresetId = 'privacy' | 'clean' | 'reset'

export const WHATSAPP_PRESETS: Record<Exclude<WhatsappPresetId, 'reset'>, Record<string, WhatsappFeatureValue>> = {
  privacy: {
    blurContactNames: true,
    blurContactPhotos: true,
    blurRecentMessages: true,
    blurConversationMessages: true,
    restoreDeletedMessages: true,
  },
  clean: {
    showSideLauncher: true,
    btnTranslate: true,
    btnQuickReply: true,
  },
}
