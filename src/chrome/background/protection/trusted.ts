import { buildProceedOnceRule, proceedOnceRuleId } from '@/core/protection'
import { normalizeHostname } from '@/core/adblock/hostname'
import { createLogger } from '@/core/logging'

const logger = createLogger('protection-trusted')

export async function allowProceedOnce(url: string): Promise<void> {
  let host: string
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return
  }
  const rule = buildProceedOnceRule(host)
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [proceedOnceRuleId(host)],
      addRules: [rule],
    })
  } catch (error) {
    logger.warn('proceed-once session rule failed', error)
  }
}

export function normalizeTrustedHostInput(raw: string): string | null {
  return normalizeHostname(raw)
}
