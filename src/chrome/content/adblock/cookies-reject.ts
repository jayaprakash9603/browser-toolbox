/**
 * Isolated world, all frames. Answers GDPR consent dialogs with "reject all" so the site
 * records a refusal instead of the banner merely being hidden by cookies.css.
 */
type GuardedWindow = Window & { __toolboxCookieReject?: boolean }

const GIVE_UP_MS = 15_000

/** Reject buttons of common consent management platforms. */
const CMP_REJECT_SELECTORS = [
  '#onetrust-reject-all-handler',
  '.ot-pc-refuse-all-handler',
  '#CybotCookiebotDialogBodyButtonDecline',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
  '#didomi-notice-disagree-button',
  '.didomi-continue-without-agreeing',
  '.qc-cmp2-summary-buttons button[mode="secondary"]',
  '.cky-btn-reject',
  '.cmplz-deny',
  '.osano-cm-denyAll',
  '.osano-cm-button--type_denyAll',
  '#truste-consent-required',
  '.t-declineAllButton',
  '[data-tid="banner-decline"]',
  '.fc-cta-do-not-consent',
  '.sp_choice_type_REJECT_ALL',
  '#tarteaucitronAllDenied2',
  '.iubenda-cs-reject-btn',
  '.cc-deny',
  '#hs-eu-decline-button',
  'button[data-cookiefirst-action="reject"]',
  '.moove-gdpr-infobar-reject-btn',
  '#cookie_action_close_header_reject',
  '.cookie-notice-reject, #cn-refuse-cookie',
  'button[aria-label="Reject all"]',
  'button[aria-label="Decline all"]',
]

const CONSENT_CONTAINER =
  '[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], [id*="gdpr" i], [class*="gdpr" i], [aria-label*="cookie" i], [aria-label*="consent" i]'

const REJECT_TEXT =
  /^(reject|decline|refuse|deny|disagree)( all| all cookies| cookies| optional cookies| non-essential( cookies)?)?$|^(only|use) (necessary|essential|required)( cookies)?( only)?$|^(continue|proceed) without (accepting|agreeing)$|^(alle )?ablehnen$|^tout refuser$|^rechazar( todo)?$|^rifiuta( tutto)?$|^weigeren$/i

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function findCmpButton(): HTMLElement | null {
  for (const selector of CMP_REJECT_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el && isVisible(el)) return el
  }
  return null
}

function findTextButton(): HTMLElement | null {
  const containers = document.querySelectorAll(CONSENT_CONTAINER)
  for (const container of containers) {
    const buttons = container.querySelectorAll<HTMLElement>('button, a[role="button"], [role="button"], input[type="button"]')
    for (const button of buttons) {
      const label = (button.textContent || (button as HTMLInputElement).value || '').trim().replace(/\s+/g, ' ')
      if (label.length <= 40 && REJECT_TEXT.test(label) && isVisible(button)) return button
    }
  }
  return null
}

function start(): void {
  let done = false
  const tryReject = (): void => {
    if (done) return
    const button = findCmpButton() ?? findTextButton()
    if (!button) return
    done = true
    observer.disconnect()
    button.click()
  }
  const observer = new MutationObserver(tryReject)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  tryReject()
  window.setTimeout(() => {
    done = true
    observer.disconnect()
  }, GIVE_UP_MS)
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxCookieReject) {
  guarded.__toolboxCookieReject = true
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
}
