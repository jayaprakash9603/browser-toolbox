import { STORAGE_KEYS } from '@/core/constants'
import { requestPermissions } from '@/core/permissions/siteAccess'
import { get, set } from '@/core/storage'

import { WHATSAPP_MATCHES } from './constants'
import { WHATSAPP_FEATURES } from './features'
import type { WhatsappFeatureValue, WhatsappPlusData, WhatsappPlusState } from './types'

export function defaultWhatsappData(): WhatsappPlusData {
  return {
    templates: [],
    smartReplies: [],
    scheduled: [],
    tasks: [],
    campaigns: [],
    webhooks: [],
    whisperApiKey: '',
    chatBackgroundDataUrl: '',
  }
}

export function defaultWhatsappValues(): Record<string, WhatsappFeatureValue> {
  const values: Record<string, WhatsappFeatureValue> = {}
  for (const f of WHATSAPP_FEATURES) {
    values[f.id] = f.default
  }
  return values
}

export const DEFAULT_WHATSAPP_PLUS_STATE: WhatsappPlusState = {
  enabled: false,
  values: defaultWhatsappValues(),
  data: defaultWhatsappData(),
}

export async function getWhatsappPlusState(): Promise<WhatsappPlusState> {
  const stored = await get<Partial<WhatsappPlusState>>(STORAGE_KEYS.whatsappPlus)
  if (!stored) return { ...DEFAULT_WHATSAPP_PLUS_STATE, values: defaultWhatsappValues(), data: defaultWhatsappData() }
  return {
    enabled: stored.enabled ?? false,
    values: { ...defaultWhatsappValues(), ...stored.values },
    data: { ...defaultWhatsappData(), ...stored.data },
  }
}

export async function updateWhatsappPlusState(
  patch: {
    enabled?: boolean
    values?: Partial<Record<string, WhatsappFeatureValue>>
    data?: Partial<WhatsappPlusData>
  },
): Promise<WhatsappPlusState> {
  const current = await getWhatsappPlusState()
  if (patch.enabled && !current.enabled && !(await requestPermissions({ origins: [...WHATSAPP_MATCHES] }))) {
    return current
  }
  const next: WhatsappPlusState = {
    enabled: patch.enabled ?? current.enabled,
    values: patch.values ? { ...current.values, ...patch.values } as Record<string, WhatsappFeatureValue> : current.values,
    data: patch.data ? { ...current.data, ...patch.data } : current.data,
  }
  await set(STORAGE_KEYS.whatsappPlus, next)
  return next
}
