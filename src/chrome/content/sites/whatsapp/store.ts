import {
  defaultWhatsappData,
  defaultWhatsappValues,
  type WhatsappFeatureValue,
  type WhatsappPlusData,
  type WhatsappPlusState,
} from '@/core/sites/whatsapp'

export const STORAGE_KEY = 'whatsappPlus'

export interface StatePatch {
  enabled?: boolean
  values?: Record<string, WhatsappFeatureValue>
  data?: Partial<WhatsappPlusData>
}

export function normalizeState(raw: unknown): WhatsappPlusState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<WhatsappPlusState>
  return {
    enabled: o.enabled ?? false,
    values: { ...defaultWhatsappValues(), ...o.values },
    data: { ...defaultWhatsappData(), ...o.data },
  }
}

export async function loadState(): Promise<WhatsappPlusState> {
  const r = await chrome.storage.local.get(STORAGE_KEY)
  return normalizeState(r[STORAGE_KEY])
}

export async function saveState(patch: StatePatch): Promise<WhatsappPlusState> {
  const cur = await loadState()
  const next: WhatsappPlusState = {
    enabled: patch.enabled ?? cur.enabled,
    values: { ...cur.values, ...patch.values },
    data: { ...cur.data, ...patch.data },
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: next })
  return next
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function activeChatTitle(): string {
  return document.querySelector('#main header span[dir="auto"]')?.textContent?.trim() ?? ''
}

export function insertIntoComposer(text: string): boolean {
  const box = document.querySelector<HTMLElement>('#main footer [contenteditable="true"]')
  if (!box) return false
  box.focus()
  document.execCommand('insertText', false, text)
  return true
}
