import { siteOfUrl } from '../domain'
import { OPENED_TAB_GESTURE_MS } from '../openedTabs'
import { containsOpenRedirectTarget, hostOfHttpUrl } from './privacy'
import { isUrlShortenerHost, matchWorkflowPolicy, workflowKindAllowed } from './providers'
import { applyRiskSignals, scoreToRisk } from './score'
import type {
  RedirectAction,
  RedirectContext,
  RedirectVerdict,
  UnknownRedirectBehavior,
  WorkflowKind,
} from './types'

const BROWSER_TRANSITIONS = new Set([
  'typed',
  'auto_bookmark',
  'generated',
  'keyword',
  'keyword_generated',
  'reload',
  'start_page',
])

function hasRecentGesture(ctx: RedirectContext): boolean {
  const window = OPENED_TAB_GESTURE_MS
  return ctx.now - ctx.lastGestureTabAt <= window || ctx.now - ctx.lastGestureOpenerAt <= window
}

function actionFromUnknown(behavior: UnknownRedirectBehavior, score: number): RedirectAction {
  if (behavior === 'allow') return 'allow'
  if (behavior === 'block') return score >= 30 ? 'block' : 'warn'
  return 'warn'
}

function sessionAllowsDest(ctx: RedirectContext): boolean {
  const session = ctx.session
  if (!session) return false
  if (ctx.now > session.expiresAt) return false
  if (session.redirectCount >= ctx.settings.maxRedirects) return false
  if (session.tabId !== ctx.tabId) return false
  const destSite = ctx.destSite
  const destHost = ctx.destHost
  if (!destSite || !destHost) return false
  if (destSite === session.initiatingSite) return true
  const policy = matchWorkflowPolicy(ctx.workflowHosts, ctx.destUrl)
  if (!policy || policy.kind !== session.kind) return false
  return workflowKindAllowed(ctx.settings, policy.kind)
}

function isBrowserInitiated(ctx: RedirectContext): boolean {
  if (ctx.transitionType && BROWSER_TRANSITIONS.has(ctx.transitionType)) return true
  if (ctx.transitionQualifiers?.some((q) => q === 'forward_back' || q === 'from_address_bar')) return true
  return false
}

function isClientRedirect(ctx: RedirectContext): boolean {
  return ctx.transitionQualifiers?.includes('client_redirect') ?? false
}

export function classifyRedirect(ctx: RedirectContext): RedirectVerdict {
  const reasons: string[] = []
  const settings = ctx.settings
  const destSite = ctx.destSite
  const sourceSite = ctx.sourceSite

  if (!settings.enabled) {
    return {
      classification: 'NORMAL_REDIRECT',
      risk: 'low',
      score: 0,
      reasons: ['smart_redirect_disabled'],
      action: 'allow',
    }
  }

  if (ctx.destThreatCategory && settings.blockMalicious) {
    reasons.push(`threat_list:${ctx.destThreatCategory}`)
    return {
      classification: 'MALICIOUS_REDIRECT',
      risk: 'critical',
      score: 100,
      reasons,
      action: 'block',
    }
  }

  if (ctx.isTrustedDest) {
    return {
      classification: 'TRUSTED_REDIRECT',
      risk: 'low',
      score: settings.riskWeights.sameOrigin,
      reasons: ['user_trusted_host'],
      action: 'allow',
    }
  }

  if (sessionAllowsDest(ctx)) {
    const complete = destSite === ctx.session?.initiatingSite
    reasons.push(complete ? 'workflow_callback' : 'active_workflow_session')
    return {
      classification: 'TRUSTED_REDIRECT',
      risk: 'low',
      score: settings.riskWeights.verifiedPayment,
      reasons,
      action: 'allow',
      completeSession: complete,
    }
  }

  if (destSite && sourceSite && destSite === sourceSite) {
    return {
      classification: 'NORMAL_REDIRECT',
      risk: 'low',
      score: settings.riskWeights.sameOrigin,
      reasons: ['same_site'],
      action: 'allow',
    }
  }

  if (isBrowserInitiated(ctx)) {
    return {
      classification: 'NORMAL_REDIRECT',
      risk: 'low',
      score: settings.riskWeights.sameOrigin,
      reasons: ['browser_initiated'],
      action: 'allow',
    }
  }

  const policy = matchWorkflowPolicy(ctx.workflowHosts, ctx.destUrl)
  const gesture = hasRecentGesture(ctx)
  if (policy && gesture && workflowKindAllowed(settings, policy.kind)) {
    const initHost = ctx.initiatingHost ?? hostOfHttpUrl(ctx.sourceUrl) ?? ctx.destHost ?? ''
    const initSite = ctx.initiatingSite ?? siteOfUrl(ctx.sourceUrl) ?? destSite ?? initHost
    reasons.push(`workflow_start:${policy.kind}`)
    return {
      classification: 'NORMAL_REDIRECT',
      risk: 'low',
      score:
        policy.kind === 'payment'
          ? settings.riskWeights.verifiedPayment
          : settings.riskWeights.verifiedAuth,
      reasons,
      action: 'allow',
      startSession: {
        kind: policy.kind as WorkflowKind,
        initiatingHost: initHost,
        initiatingSite: initSite ?? initHost,
      },
    }
  }

  const signals: Partial<Record<keyof typeof settings.riskWeights, boolean>> = {}
  if (destSite && sourceSite && destSite !== sourceSite) {
    signals.crossDomainUnrelated = true
    reasons.push('cross_domain')
  }
  if (settings.detectJavascript && isClientRedirect(ctx)) {
    signals.unknownJavascript = true
    reasons.push('client_redirect')
  }
  if (settings.detectMetaRefresh && ctx.metaRefresh) {
    signals.unexpectedMetaRefresh = true
    reasons.push('meta_refresh')
  }
  if (settings.detectChains && ctx.recentHopCount > 3) {
    signals.multipleUnexpected = true
    reasons.push('redirect_chain')
  }
  if (isUrlShortenerHost(ctx.destHost)) {
    signals.multipleUnexpected = true
    reasons.push('url_shortener')
  }
  if (containsOpenRedirectTarget(ctx.destUrl, destSite)) {
    signals.crossDomainUnrelated = true
    reasons.push('open_redirect_pattern')
  }

  let score = applyRiskSignals(settings.riskWeights, signals)
  const risk = scoreToRisk(score)

  let classification: RedirectVerdict['classification'] = 'UNKNOWN_REDIRECT'
  if (ctx.isOpenedTab && settings.detectAutomatic) classification = 'SUSPICIOUS_REDIRECT'
  if (score >= 60) classification = 'SUSPICIOUS_REDIRECT'

  let action: RedirectAction = actionFromUnknown(settings.unknownBehavior, score)
  if (classification === 'SUSPICIOUS_REDIRECT' && settings.unknownBehavior === 'block' && score >= 45) {
    action = 'block'
  }
  if (ctx.isOpenedTab && !gesture && !policy && settings.detectAutomatic && action === 'allow') {
    action = settings.unknownBehavior === 'allow' ? 'allow' : settings.unknownBehavior
  }

  if (ctx.isOpenedTab && !gesture && !policy && !ctx.session && settings.detectAutomatic) {
    if (settings.unknownBehavior === 'block') {
      action = 'block'
      classification = 'SUSPICIOUS_REDIRECT'
      score = Math.max(score, settings.riskWeights.crossDomainUnrelated)
    } else if (settings.unknownBehavior === 'warn') {
      action = 'warn'
      classification = 'SUSPICIOUS_REDIRECT'
    }
  }

  return {
    classification,
    risk,
    score,
    reasons,
    action,
  }
}
