import type { WhatsappSection } from './types'

export const WHATSAPP_FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  blurContactNames: { label: 'Blur contact names', description: 'Hide chat names until you hover them.' },
  blurContactPhotos: { label: 'Blur contact photos', description: 'Hide profile pictures until you hover them.' },
  blurRecentMessages: { label: 'Blur recent messages', description: 'Hide message previews in the chat list.' },
  blurConversationMessages: { label: 'Blur conversation messages', description: 'Hide message bubbles until you hover them.' },
  blurComposer: { label: 'Blur message composer input', description: 'Hide what you type until the box is focused.' },
  restoreDeletedMessages: { label: 'Restore deleted messages', description: 'Show a copy of messages deleted for everyone.' },
  customChatBackground: { label: 'Set custom chat background image', description: 'Use your own wallpaper behind conversations.' },
  showSideLauncher: { label: 'Show ChatBoost button in sidebar', description: 'Green plus button in the left navigation rail.' },
  chatPulse: {
    label: 'ChatPulse Analytics',
    description: 'Full messaging dashboard overlay with charts and insights (right-click or drawer).',
  },
  btnStartChat: { label: 'Start chat with any number', description: 'Header button to open a chat without saving the contact.' },
  btnTranslate: { label: 'Translate message button', description: 'Translate a message inline on hover.' },
  btnQuickReply: { label: 'Quick reply button', description: 'Insert a saved template from the chat header.' },
  btnAddTask: { label: 'Add task button', description: 'Create a task linked to the open chat.' },
  btnExportChat: { label: 'Export chat button', description: 'Export the open chat to HTML, JSON, Excel, or CSV.' },
}

export const WHATSAPP_SECTION_INFO: Record<WhatsappSection, { label: string; description: string }> = {
  privacy: { label: 'Private Mode', description: 'Anti screen spying and deleted messages' },
  custom: { label: 'Customizations', description: 'Make WhatsApp yours' },
  buttons: { label: 'Extra Buttons', description: 'Header and message buttons WhatsApp lacks' },
}

export function featureLabel(id: string): string {
  return WHATSAPP_FEATURE_LABELS[id]?.label ?? id
}
