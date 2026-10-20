import type { WhatsappSection } from './types'

export const WHATSAPP_FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  blurContactNames: { label: 'Blur contact names', description: 'Hide chat names until you hover them.' },
  blurContactPhotos: { label: 'Blur contact photos', description: 'Hide profile pictures until you hover them.' },
  blurRecentMessages: { label: 'Blur recent messages', description: 'Hide message previews in the chat list.' },
  blurConversationMessages: { label: 'Blur conversation messages', description: 'Hide message bubbles until you hover them.' },
  blurComposer: { label: 'Blur message composer input', description: 'Hide what you type until the box is focused.' },
  hideTyping: { label: 'Hide typing status', description: 'Others will not see "typing…".' },
  hideRecording: { label: 'Hide recording status', description: 'Others will not see "recording audio…".' },
  viewStatusPrivately: { label: 'View statuses privately', description: 'Watch statuses without sending a view receipt.' },
  playAudioPrivately: { label: 'Play audio messages privately', description: 'Play voice notes without marking them played.' },
  disableReadReceipts: { label: 'Disable read receipts', description: 'Read messages without blue ticks.' },
  invisibleMode: { label: 'Hide online status (Invisible Mode)', description: 'Appear offline while using WhatsApp.' },
  restoreDeletedMessages: { label: 'Restore deleted messages', description: 'Keep a copy of messages deleted for everyone.' },
  notifyOnline: { label: 'Notify about online activities', description: 'Get a notification when a contact comes online.' },
  notifyTyping: { label: 'Notify about typing and recording activities', description: 'Get a notification when someone is typing.' },
  preventListJump: { label: 'Prevent chats list jumping on message submission', description: 'Keep the chat list scroll position.' },
  customChatBackground: { label: 'Set custom chat background image', description: 'Use your own wallpaper for conversations.' },
  showSideLauncher: { label: 'Show WA Web Plus button in sidebar', description: 'Green plus button in the left navigation rail.' },
  btnLike: { label: 'Like button', description: 'Quick 👍 reaction on message hover.' },
  btnPinChat: { label: 'Pin chat button', description: 'Pin the open chat from its header.' },
  btnStartChat: { label: 'Start new chat', description: 'Open a chat with any phone number.' },
  btnMarkRead: { label: 'Mark conversation as read/unread', description: 'Toggle unread state from the chat header.' },
  btnTranscribe: { label: 'Transcribe audio messages button', description: 'Convert voice notes to text (Whisper API key).' },
  btnTranslate: { label: 'Translate message button', description: 'Translate a message on hover.' },
  btnDownloadStatus: { label: 'Download status button', description: 'Save status photos and videos.' },
  btnChatInfo: { label: 'Chat info button', description: 'Show details about the open chat.' },
  btnQuickReply: { label: 'Quick reply buttons', description: 'Insert a template from the chat header.' },
  btnAddTask: { label: 'Add task button', description: 'Create a task from the open chat.' },
  btnSaveContact: { label: 'Save contact button', description: 'Save an unknown number as a contact.' },
  whisperApiKey: { label: 'Whisper API key', description: 'OpenAI key used for audio transcription.' },
}

export const WHATSAPP_SECTION_INFO: Record<WhatsappSection, { label: string; description: string }> = {
  privacy: { label: 'Private Mode', description: 'Anti screen and status spying' },
  custom: { label: 'Customizations', description: 'Other different useful functions' },
  buttons: { label: 'Extra Buttons', description: 'Add new buttons with additional functions' },
}

export function featureLabel(id: string): string {
  return WHATSAPP_FEATURE_LABELS[id]?.label ?? id
}
