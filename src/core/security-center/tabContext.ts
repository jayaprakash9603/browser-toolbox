import { registrableDomain } from '@/core/protection/domain'

function restrictedReason(url: string | undefined): string | null {
  if (!url) return 'No inspectable website is active.'
  const lower = url.toLowerCase()
  if (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('chrome-untrusted://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('moz-extension://') ||
    lower.startsWith('about:')
  ) {
    return 'This page is a browser or extension surface and cannot be inspected.'
  }
  return null
}

export interface TabSecurityContext {
  tabId?: number
  url: string
  domain: string
  hostname: string
  https: boolean
  restricted: boolean
  restrictedReason?: string
}

export function tabContextFromUrl(url: string | undefined, tabId?: number): TabSecurityContext {
  const restricted = restrictedReason(url)
  if (!url || restricted) {
    return {
      tabId,
      url: url ?? '',
      domain: '',
      hostname: '',
      https: false,
      restricted: true,
      restrictedReason: restricted ?? 'No inspectable website is active.',
    }
  }
  try {
    const parsed = new URL(url)
    const https = parsed.protocol === 'https:'
    const http = parsed.protocol === 'http:'
    if (!https && !http) {
      return {
        tabId,
        url,
        domain: '',
        hostname: '',
        https: false,
        restricted: true,
        restrictedReason: 'Only http(s) websites can be audited.',
      }
    }
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()
    return {
      tabId,
      url,
      domain: registrableDomain(hostname),
      hostname,
      https,
      restricted: false,
    }
  } catch {
    return {
      tabId,
      url,
      domain: '',
      hostname: '',
      https: false,
      restricted: true,
      restrictedReason: 'The active tab URL could not be parsed.',
    }
  }
}
