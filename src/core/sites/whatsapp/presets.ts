import type { WhatsappFeatureValue } from './types'

export type WhatsappPresetId = 'privacy' | 'clean' | 'reset'

export const WHATSAPP_PRESETS: Record<Exclude<WhatsappPresetId, 'reset'>, Record<string, WhatsappFeatureValue>> = {
  privacy: {
    blurContactNames: true,
    blurContactPhotos: true,
    blurRecentMessages: true,
    blurConversationMessages: true,
    hideTyping: true,
    hideRecording: true,
    disableReadReceipts: true,
    invisibleMode: true,
    restoreDeletedMessages: true,
  },
  clean: {
    preventListJump: true,
    showSideLauncher: true,
    hideTyping: true,
    btnMarkRead: true,
    btnChatInfo: true,
  },
}
