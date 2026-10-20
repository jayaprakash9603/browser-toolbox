import {
  CSS_FEATURE_IDS,
  featureAttrName,
  isFeatureOn,
  MAX_CHAT_BACKGROUND_BYTES,
  type WhatsappPlusState,
} from '@/core/sites/whatsapp'

import { startScriptFeatures, stopScriptFeatures } from './features'

const STYLE_LINK_ID = 'toolbox-wa-css'
const ACTIVE_ATTR = 'data-tbx-wa-active'

function applyCssFeatures(state: WhatsappPlusState): void {
  const root = document.documentElement
  root.setAttribute(ACTIVE_ATTR, 'true')
  for (const id of CSS_FEATURE_IDS) {
    const on = state.values[id] === true
    if (on) root.setAttribute(featureAttrName(id), 'true')
    else root.removeAttribute(featureAttrName(id))
  }
  if (isFeatureOn(state.values, 'preventListJump')) {
    root.setAttribute(featureAttrName('preventListJump'), 'true')
  } else {
    root.removeAttribute(featureAttrName('preventListJump'))
  }
}

function applyChatBackground(state: WhatsappPlusState): void {
  const root = document.documentElement
  const main = document.querySelector('#main') as HTMLElement | null
  const on = isFeatureOn(state.values, 'customChatBackground')
  const url = state.data.chatBackgroundDataUrl
  if (on && url && url.length < MAX_CHAT_BACKGROUND_BYTES) {
    root.setAttribute(featureAttrName('customChatBackground'), 'true')
    if (main) main.style.backgroundImage = `url("${url.replace(/"/g, '')}")`
  } else {
    root.removeAttribute(featureAttrName('customChatBackground'))
    if (main) main.style.removeProperty('background-image')
  }
}

function ensureCssLink(): void {
  if (document.getElementById(STYLE_LINK_ID)) return
  const link = document.createElement('link')
  link.id = STYLE_LINK_ID
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('sites/whatsapp/whatsapp.css')
  document.head.appendChild(link)
}

export function applyWhatsappPlus(state: WhatsappPlusState): void {
  if (!state.enabled) {
    stopAll()
    return
  }
  ensureCssLink()
  applyCssFeatures(state)
  applyChatBackground(state)
  startScriptFeatures({ state })
}

export function stopAll(): void {
  stopScriptFeatures()
  const root = document.documentElement
  for (const attr of [...root.attributes]) {
    if (attr.name.startsWith('data-tbx-wa-')) root.removeAttribute(attr.name)
  }
  document.getElementById(STYLE_LINK_ID)?.remove()
  document.querySelectorAll('.tbx-wa-launcher, .tbx-wa-extra-btn, .tbx-wa-restored-msg').forEach((el) => el.remove())
  const main = document.querySelector('#main') as HTMLElement | null
  if (main) main.style.removeProperty('background-image')
}
