import type { RedirectSession, RedirectVerdict, WorkflowKind } from './types'

export function createRedirectSession(params: {
  tabId: number
  openerTabId?: number
  initiatingHost: string
  initiatingSite: string
  kind: WorkflowKind
  now: number
  ttlMs: number
  destHost: string
}): RedirectSession {
  return {
    tabId: params.tabId,
    openerTabId: params.openerTabId,
    initiatingHost: params.initiatingHost,
    initiatingSite: params.initiatingSite,
    kind: params.kind,
    createdAt: params.now,
    expiresAt: params.now + params.ttlMs,
    redirectCount: 1,
    chainHosts: [params.destHost],
  }
}

export function advanceRedirectSession(
  session: RedirectSession,
  destHost: string,
  now: number,
): RedirectSession | null {
  if (now > session.expiresAt) return null
  const hosts = session.chainHosts.includes(destHost)
    ? session.chainHosts
    : [...session.chainHosts, destHost]
  return {
    ...session,
    redirectCount: session.redirectCount + 1,
    chainHosts: hosts,
  }
}

export function applyVerdictToSession(
  session: RedirectSession | null,
  verdict: RedirectVerdict,
  destHost: string,
  tabId: number,
  openerTabId: number | undefined,
  now: number,
  ttlMs: number,
): RedirectSession | null {
  if (verdict.completeSession) return null
  if (verdict.startSession) {
    return createRedirectSession({
      tabId,
      openerTabId,
      initiatingHost: verdict.startSession.initiatingHost,
      initiatingSite: verdict.startSession.initiatingSite,
      kind: verdict.startSession.kind,
      now,
      ttlMs,
      destHost,
    })
  }
  if (!session || session.tabId !== tabId) return session
  if (verdict.action === 'allow' && verdict.classification !== 'MALICIOUS_REDIRECT') {
    return advanceRedirectSession(session, destHost, now)
  }
  return session
}

export function isSessionExpired(session: RedirectSession, now: number): boolean {
  return now > session.expiresAt
}
