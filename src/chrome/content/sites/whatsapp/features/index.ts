import { isFeatureOn, type WhatsappPlusState } from '@/core/sites/whatsapp'

import { postToMain } from '../bridge'
import { startButtons, stopButtons } from './buttons'
import { mountLauncher } from './custom'

export interface FeatureContext {
  state: WhatsappPlusState
}

export function startScriptFeatures(ctx: FeatureContext): void {
  stopScriptFeatures()
  if (!ctx.state.enabled) return
  const v = ctx.state.values

  postToMain('syncState', { values: v, data: ctx.state.data })
  mountLauncher(isFeatureOn(v, 'showSideLauncher'))
  startButtons(ctx.state)
}

export function stopScriptFeatures(): void {
  postToMain('syncState', null)
  stopButtons()
  mountLauncher(false)
}
