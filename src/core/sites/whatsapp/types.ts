export const WHATSAPP_SECTIONS = ['privacy', 'custom', 'buttons'] as const
export type WhatsappSection = (typeof WHATSAPP_SECTIONS)[number]

export const WHATSAPP_TOOL_TABS = ['enhancements', 'business', 'export', 'utilities'] as const
export type WhatsappToolTab = (typeof WHATSAPP_TOOL_TABS)[number]

export type FeatureKind = 'toggle' | 'select' | 'number' | 'color' | 'text'

export type FeatureImpl = 'css' | 'script' | 'style'

export interface WhatsappFeatureDef {
  id: string
  section: WhatsappSection
  kind: FeatureKind
  impl: FeatureImpl
  default: boolean | number | string
  bestEffort?: boolean
  min?: number
  max?: number
  step?: number
  options?: { value: string; labelKey: string }[]
}

export type WhatsappFeatureValue = boolean | number | string

export interface MessageTemplate {
  id: string
  name: string
  body: string
  createdAt: number
}

export interface SmartReplyRule {
  id: string
  name: string
  pattern: string
  isRegex: boolean
  reply: string
  enabled: boolean
  cooldownMinutes: number
  excludeChats: string
}

export interface ScheduledMessage {
  id: string
  chatId: string
  chatLabel: string
  body: string
  fireAt: number
  status: 'pending' | 'sent' | 'missed' | 'cancelled'
}

export interface WaTask {
  id: string
  title: string
  chatId?: string
  chatLabel?: string
  dueAt?: number
  done: boolean
  createdAt: number
}

export interface BroadcastCampaign {
  id: string
  name: string
  message: string
  recipientSource: 'label' | 'group' | 'csv'
  recipientRef: string
  status: 'draft' | 'running' | 'paused' | 'done' | 'cancelled'
  sent: number
  total: number
  dailyCap: number
  delayMinSec: number
  delayMaxSec: number
  workingHoursStart: string
  workingHoursEnd: string
  respectWorkingHours: boolean
  createdAt: number
}

export interface WebhookConfig {
  id: string
  url: string
  events: ('message' | 'revoke' | 'group_join' | 'group_leave')[]
  enabled: boolean
}

export interface WhatsappPlusData {
  templates: MessageTemplate[]
  smartReplies: SmartReplyRule[]
  scheduled: ScheduledMessage[]
  tasks: WaTask[]
  campaigns: BroadcastCampaign[]
  webhooks: WebhookConfig[]
  whisperApiKey: string
  chatBackgroundDataUrl: string
}

export interface WhatsappPlusState {
  enabled: boolean
  values: Record<string, WhatsappFeatureValue>
  data: WhatsappPlusData
}

export type WaRuntimeStatus = 'no_tab' | 'loading' | 'not_logged_in' | 'ready'
