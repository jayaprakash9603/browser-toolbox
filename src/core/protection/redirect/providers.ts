import { pathOfHttpUrl } from './privacy'
import type { WorkflowHostPolicy, WorkflowKind } from './types'

export const BUNDLED_WORKFLOW_POLICIES: WorkflowHostPolicy[] = [
  { host: 'checkout.razorpay.com', kind: 'payment' },
  { host: 'api.razorpay.com', kind: 'payment' },
  { host: 'secure.payu.in', kind: 'payment' },
  { host: 'checkout.stripe.com', kind: 'payment' },
  { host: 'js.stripe.com', kind: 'payment' },
  { host: 'hooks.stripe.com', kind: 'payment' },
  { host: 'checkout.cashfree.com', kind: 'payment' },
  { host: 'payments.cashfree.com', kind: 'payment' },
  { host: 'paytm.com', kind: 'payment' },
  { host: 'securegw.paytm.in', kind: 'payment' },
  { host: 'accounts.google.com', kind: 'auth' },
  { host: 'login.microsoftonline.com', kind: 'auth' },
  { host: 'login.live.com', kind: 'auth' },
  { host: 'github.com', kind: 'auth', pathPrefix: '/login' },
  { host: 'github.com', kind: 'auth', pathPrefix: '/sessions' },
  { host: 'appleid.apple.com', kind: 'auth' },
  { host: 'onlinesbi.sbi', kind: 'banking' },
  { host: 'retail.onlinesbi.sbi', kind: 'banking' },
  { host: 'hdfcbank.com', kind: 'banking' },
  { host: 'netbanking.hdfcbank.com', kind: 'banking' },
  { host: 'icicibank.com', kind: 'banking' },
  { host: 'infinity.icicibank.com', kind: 'banking' },
]

const URL_SHORTENERS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rb.gy',
  'shorturl.at',
])

export function mergeWorkflowPolicies(user: WorkflowHostPolicy[]): WorkflowHostPolicy[] {
  const seen = new Set<string>()
  const out: WorkflowHostPolicy[] = []
  for (const policy of [...BUNDLED_WORKFLOW_POLICIES, ...user]) {
    const host = policy.host.replace(/^www\./, '').toLowerCase()
    const key = `${policy.kind}:${host}:${policy.pathPrefix ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...policy, host })
  }
  return out
}

export function matchWorkflowPolicy(
  policies: WorkflowHostPolicy[],
  destUrl: string,
): WorkflowHostPolicy | null {
  const host = hostFromUrl(destUrl)
  if (!host) return null
  const path = pathOfHttpUrl(destUrl)
  for (const policy of policies) {
    if (host !== policy.host && !host.endsWith(`.${policy.host}`)) continue
    if (policy.pathPrefix && !path.startsWith(policy.pathPrefix)) continue
    return policy
  }
  return null
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

export function workflowKindAllowed(
  settings: { allowPayment: boolean; allowAuth: boolean; allowBanking: boolean },
  kind: WorkflowKind,
): boolean {
  if (kind === 'payment') return settings.allowPayment
  if (kind === 'auth') return settings.allowAuth
  return settings.allowBanking
}

export function isUrlShortenerHost(host: string | null): boolean {
  if (!host) return false
  const h = host.replace(/^www\./, '').toLowerCase()
  return URL_SHORTENERS.has(h)
}
