import { sendMessage } from '@/core/messaging'

/**
 * Lets pages that send X-Frame-Options, CSP frame-ancestors, or CORP headers render in the viewer's iframes.
 * Runs in the service worker so session rules apply reliably.
 */
export async function setFramingAllowed(allowed: boolean): Promise<boolean> {
  const data = await sendMessage<{ applied: boolean }>({ type: 'RV_FRAMING_SET', allowed })
  return data?.applied ?? false
}
