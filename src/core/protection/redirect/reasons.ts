const REASON_LABELS: Record<string, string> = {
  same_site: 'Same website (including subdomains)',
  same_site_as_opener: 'Same website as the tab that opened this one',
  user_trusted_host: 'Destination is on your trusted sites list',
  user_trusted_source: 'The site that sent you here is on your trusted list',
  user_initiated: 'You clicked or submitted a form to open this page',
  workflow_callback: 'Return to the site that started checkout or sign-in',
  active_workflow_session: 'Part of an allowed payment or sign-in flow',
  browser_initiated: 'You opened this address yourself',
  workflow_start: 'Known payment or sign-in provider',
  cross_domain: 'Different website than the page that opened this tab',
  client_redirect: 'Automatic JavaScript redirect without a recent click',
  meta_refresh: 'Automatic page refresh to another address',
  redirect_chain: 'Many redirects in a short time',
  url_shortener: 'Link shortener redirect',
  open_redirect_pattern: 'Address may hide a third-party destination',
  smart_redirect_disabled: 'Smart redirect protection is off',
}

export function primaryRedirectReasonLabel(reasons: string[]): string {
  for (const code of reasons) {
    if (code.startsWith('threat_list:')) return 'Known malicious or phishing destination'
    if (code.startsWith('workflow_start:')) return REASON_LABELS.workflow_start
    if (REASON_LABELS[code]) return REASON_LABELS[code]
  }
  return reasons[0] ?? 'Suspicious automatic redirect'
}
