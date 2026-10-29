import type { TechRule } from '../types'

const VERSION = '(?<v>\\d+(?:\\.\\d+)+)'

export const ANALYTICS_RULES: TechRule[] = [
  {
    name: 'Google Analytics',
    category: 'analytics',
    website: 'https://marketingplatform.google.com/about/analytics',
    src: ['googletagmanager\\.com/gtag/js\\?id=(?<v>G|UA)-', 'google-analytics\\.com/(?:analytics|ga)\\.js'],
    inline: ["gtag\\(\\s*['\"]config['\"]\\s*,\\s*['\"](?<v>G|UA)-"],
    js: { GoogleAnalyticsObject: '', gtag: '' },
    cookies: ['^_ga$', '^_ga_[A-Z0-9]+$'],
    versionLabels: { G: 'GA4', UA: 'Universal' },
  },
  { name: 'Matomo', category: 'analytics', website: 'https://matomo.org', src: ['matomo\\.js', 'piwik\\.js'], js: { Matomo: '', Piwik: '' } },
  { name: 'Plausible', category: 'analytics', website: 'https://plausible.io', src: ['plausible\\.io/js/'] },
  { name: 'Fathom', category: 'analytics', website: 'https://usefathom.com', src: ['cdn\\.usefathom\\.com'] },
  { name: 'PostHog', category: 'analytics', website: 'https://posthog.com', src: ['posthog(?:\\.min)?\\.js', 'us\\.i\\.posthog\\.com', 'eu\\.i\\.posthog\\.com'], js: { posthog: '' } },
  { name: 'Mixpanel', category: 'analytics', website: 'https://mixpanel.com', src: ['cdn\\.mxpnl\\.com', 'mixpanel(?:\\.min)?\\.js'], js: { mixpanel: '' } },
  { name: 'Segment', category: 'analytics', website: 'https://segment.com', src: ['cdn\\.segment\\.(?:com|io)'], js: { 'analytics.SNIPPET_VERSION': '(?<v>[\\d.]+)' } },
  { name: 'Amplitude', category: 'analytics', website: 'https://amplitude.com', src: ['cdn\\.amplitude\\.com'], js: { amplitude: '' } },
  { name: 'Heap', category: 'analytics', website: 'https://heap.io', src: ['cdn\\.heapanalytics\\.com'], js: { heap: '' } },
  { name: 'Hotjar', category: 'analytics', website: 'https://www.hotjar.com', src: ['static\\.hotjar\\.com', 'script\\.hotjar\\.com'], js: { hj: '' } },
  { name: 'Microsoft Clarity', category: 'analytics', website: 'https://clarity.microsoft.com', src: ['clarity\\.ms/tag/'], js: { clarity: '' } },
  { name: 'Crazy Egg', category: 'analytics', website: 'https://www.crazyegg.com', src: ['script\\.crazyegg\\.com'] },
  { name: 'FullStory', category: 'analytics', website: 'https://www.fullstory.com', src: ['fullstory\\.com/s/fs\\.js', 'edge\\.fullstory\\.com'], js: { FS: '' } },
  { name: 'LogRocket', category: 'analytics', website: 'https://logrocket.com', src: ['cdn\\.logrocket\\.(?:com|io)', 'cdn\\.lr-ingest\\.io'], js: { LogRocket: '' } },
  { name: 'Mouseflow', category: 'analytics', website: 'https://mouseflow.com', src: ['cdn\\.mouseflow\\.com'] },
  { name: 'Adobe Analytics', category: 'analytics', website: 'https://business.adobe.com/products/analytics', src: ['omtrdc\\.net', 'AppMeasurement(?:\\.min)?\\.js'], js: { s_account: '' } },
  { name: 'Yandex.Metrica', category: 'analytics', website: 'https://metrica.yandex.com', src: ['mc\\.yandex\\.(?:ru|com)/metrika/'], js: { ym: '' } },
  { name: 'Baidu Analytics', category: 'analytics', website: 'https://tongji.baidu.com', src: ['hm\\.baidu\\.com/hm\\.js'] },
  { name: 'Vercel Analytics', category: 'analytics', website: 'https://vercel.com/analytics', src: ['/_vercel/insights/script\\.js'] },
  { name: 'Statcounter', category: 'analytics', website: 'https://statcounter.com', src: ['statcounter\\.com/counter'] },
]

export const TAG_AND_AD_RULES: TechRule[] = [
  {
    name: 'Google Tag Manager',
    category: 'tag-manager',
    website: 'https://tagmanager.google.com',
    src: ['googletagmanager\\.com/gtm\\.js'],
    html: ['googletagmanager\\.com/ns\\.html'],
    js: { google_tag_manager: '' },
  },
  { name: 'Cloudflare Zaraz', category: 'performance', website: 'https://zaraz.com', src: ['/cdn-cgi/zaraz/'], js: { zaraz: '' } },
  { name: 'Tealium', category: 'tag-manager', website: 'https://tealium.com', src: ['tags\\.tiqcdn\\.com'], js: { utag: '' } },
  { name: 'Adobe Launch', category: 'tag-manager', website: 'https://experienceleague.adobe.com/docs/experience-platform/tags', src: ['assets\\.adobedtm\\.com'] },
  { name: 'Google AdSense', category: 'advertising', website: 'https://www.google.com/adsense', src: ['pagead2\\.googlesyndication\\.com'], js: { adsbygoogle: '' } },
  { name: 'Google Publisher Tag', category: 'advertising', website: 'https://developers.google.com/publisher-tag', src: ['securepubads\\.g\\.doubleclick\\.net/tag/js/gpt\\.js'], js: { googletag: '' } },
  { name: 'DoubleClick', category: 'advertising', website: 'https://marketingplatform.google.com', src: ['(?:stats|ad)\\.g\\.doubleclick\\.net'] },
  { name: 'Meta Pixel', category: 'advertising', website: 'https://www.facebook.com/business/tools/meta-pixel', src: ['connect\\.facebook\\.net/[a-zA-Z_]+/fbevents\\.js'], js: { fbq: '' } },
  { name: 'TikTok Pixel', category: 'advertising', website: 'https://ads.tiktok.com', src: ['analytics\\.tiktok\\.com'], js: { ttq: '' } },
  { name: 'LinkedIn Insight Tag', category: 'advertising', website: 'https://business.linkedin.com', src: ['snap\\.licdn\\.com/li\\.lms-analytics'], js: { _linkedin_partner_id: '' } },
  { name: 'X Pixel', category: 'advertising', website: 'https://ads.x.com', src: ['static\\.ads-twitter\\.com/uwt\\.js'], js: { twq: '' } },
  { name: 'Pinterest Tag', category: 'advertising', website: 'https://business.pinterest.com', src: ['s\\.pinimg\\.com/ct/core\\.js'], js: { pintrk: '' } },
  { name: 'Snap Pixel', category: 'advertising', website: 'https://forbusiness.snapchat.com', src: ['sc-static\\.net/scevent'], js: { snaptr: '' } },
  { name: 'Criteo', category: 'advertising', website: 'https://www.criteo.com', src: ['static\\.criteo\\.net', 'dynamic\\.criteo\\.com'] },
  { name: 'Taboola', category: 'advertising', website: 'https://www.taboola.com', src: ['cdn\\.taboola\\.com'], js: { _taboola: '' } },
  { name: 'Outbrain', category: 'advertising', website: 'https://www.outbrain.com', src: ['outbrain\\.com/outbrain\\.js'] },
  { name: 'Amazon Advertising', category: 'advertising', website: 'https://advertising.amazon.com', src: ['amazon-adsystem\\.com'] },
]

export const MARKETING_RULES: TechRule[] = [
  { name: 'HubSpot', category: 'marketing', website: 'https://www.hubspot.com', src: ['js\\.hs-scripts\\.com', 'js\\.hs-analytics\\.net', 'js\\.hsforms\\.net', 'js\\.hs-banner\\.com'], js: { _hsq: '' } },
  { name: 'Mailchimp', category: 'marketing', website: 'https://mailchimp.com', src: ['chimpstatic\\.com', 'list-manage\\.com'] },
  { name: 'Klaviyo', category: 'marketing', website: 'https://www.klaviyo.com', src: ['static\\.klaviyo\\.com'], js: { klaviyo: '' } },
  { name: 'Marketo', category: 'marketing', website: 'https://business.adobe.com/products/marketo', src: ['munchkin\\.marketo\\.net', 'mktoweb\\.com'], js: { Munchkin: '' } },
  { name: 'Pardot', category: 'marketing', website: 'https://www.salesforce.com/marketing/b2b-automation', src: ['pi\\.pardot\\.com'], js: { piAId: '' } },
  { name: 'ActiveCampaign', category: 'marketing', website: 'https://www.activecampaign.com', src: ['trackcmp\\.net', 'activehosted\\.com'] },
  { name: 'Brevo', category: 'marketing', website: 'https://www.brevo.com', src: ['sibautomation\\.com', 'sendinblue\\.com'] },
  { name: 'ConvertKit', category: 'marketing', website: 'https://convertkit.com', src: ['f\\.convertkit\\.com', 'convertkit\\.com/[^/]{1,60}/index\\.js'] },
  { name: 'OneSignal', category: 'marketing', website: 'https://onesignal.com', src: ['cdn\\.onesignal\\.com'], js: { OneSignal: '' } },
  { name: 'VWO', category: 'ab-testing', website: 'https://vwo.com', src: ['dev\\.visualwebsiteoptimizer\\.com'], js: { _vwo_code: '' } },
  { name: 'Optimizely', category: 'ab-testing', website: 'https://www.optimizely.com', src: ['cdn\\.optimizely\\.com'], js: { optimizely: '' } },
  { name: 'LaunchDarkly', category: 'ab-testing', website: 'https://launchdarkly.com', src: ['launchdarkly\\.com'] },
]

export const SUPPORT_RULES: TechRule[] = [
  { name: 'Intercom', category: 'live-chat', website: 'https://www.intercom.com', src: ['widget\\.intercom\\.io', 'js\\.intercomcdn\\.com'], js: { Intercom: '' } },
  { name: 'Drift', category: 'live-chat', website: 'https://www.drift.com', src: ['js\\.driftt\\.com'], js: { drift: '' } },
  { name: 'Zendesk', category: 'live-chat', website: 'https://www.zendesk.com', src: ['static\\.zdassets\\.com'], js: { zE: '' } },
  { name: 'Crisp', category: 'live-chat', website: 'https://crisp.chat', src: ['client\\.crisp\\.chat'], js: { $crisp: '' } },
  { name: 'Tawk.to', category: 'live-chat', website: 'https://www.tawk.to', src: ['embed\\.tawk\\.to'], js: { Tawk_API: '' } },
  { name: 'LiveChat', category: 'live-chat', website: 'https://www.livechat.com', src: ['cdn\\.livechatinc\\.com'], js: { LiveChatWidget: '' } },
  { name: 'Freshchat', category: 'live-chat', website: 'https://www.freshworks.com/live-chat-software', src: ['wchat\\.freshchat\\.com'] },
  { name: 'Tidio', category: 'live-chat', website: 'https://www.tidio.com', src: ['code\\.tidio\\.co'] },
  { name: 'Help Scout', category: 'live-chat', website: 'https://www.helpscout.com', src: ['beacon-v2\\.helpscout\\.net'] },
  { name: 'Salesforce', category: 'crm', website: 'https://www.salesforce.com', src: ['force\\.com', 'salesforceliveagent\\.com'] },
  { name: 'Zoho', category: 'crm', website: 'https://www.zoho.com', src: ['salesiq\\.zoho\\.com', 'zohopublic\\.com', 'zohocdn\\.com'] },
]

export const MONITORING_RULES: TechRule[] = [
  { name: 'Cloudflare Browser Insights', category: 'rum', website: 'https://www.cloudflare.com/web-analytics', src: ['static\\.cloudflareinsights\\.com/beacon(?:\\.min)?\\.js'] },
  { name: 'New Relic', category: 'rum', website: 'https://newrelic.com', src: ['js-agent\\.newrelic\\.com', 'bam\\.nr-data\\.net'], js: { NREUM: '', newrelic: '' } },
  { name: 'Datadog RUM', category: 'rum', website: 'https://www.datadoghq.com', src: ['datadoghq-browser-agent\\.com'], js: { DD_RUM: '' } },
  { name: 'Vercel Speed Insights', category: 'rum', website: 'https://vercel.com/docs/speed-insights', src: ['/_vercel/speed-insights/script\\.js'] },
  { name: 'Sentry', category: 'error-tracking', website: 'https://sentry.io', src: ['browser\\.sentry-cdn\\.com', 'js\\.sentry-cdn\\.com'], js: { Sentry: '', __SENTRY__: '' } },
  { name: 'Rollbar', category: 'error-tracking', website: 'https://rollbar.com', src: ['cdn\\.rollbar\\.com'], js: { Rollbar: '' } },
  { name: 'Bugsnag', category: 'error-tracking', website: 'https://www.bugsnag.com', src: ['d2wy8f7a9ursnm\\.cloudfront\\.net', 'bugsnag(?:\\.min)?\\.js'], js: { Bugsnag: '' } },
  { name: 'TrackJS', category: 'error-tracking', website: 'https://trackjs.com', src: ['cdn\\.trackjs\\.com'], js: { trackJs: '' } },
  { name: 'Raygun', category: 'error-tracking', website: 'https://raygun.com', src: ['cdn\\.raygun\\.io'] },
]

export const SEARCH_AND_BACKEND_RULES: TechRule[] = [
  { name: 'Algolia', category: 'search', website: 'https://www.algolia.com', src: ['algolianet\\.com', 'algolia\\.net', 'algoliasearch'], js: { algoliasearch: '' } },
  { name: 'Firebase', category: 'backend', website: 'https://firebase.google.com', src: [`gstatic\\.com/firebasejs/${VERSION}`, 'firebaseapp\\.com', 'firebaseio\\.com'], js: { 'firebase.SDK_VERSION': VERSION } },
  { name: 'Supabase', category: 'backend', website: 'https://supabase.com', src: ['supabase\\.(?:co|com)', 'supabase-js'] },
  { name: 'Auth0', category: 'authentication', website: 'https://auth0.com', src: ['cdn\\.auth0\\.com'], js: { auth0: '' } },
  { name: 'Okta', category: 'authentication', website: 'https://www.okta.com', src: ['okta(?:cdn)?\\.com'] },
  { name: 'Clerk', category: 'authentication', website: 'https://clerk.com', js: { Clerk: '' }, src: ['clerk\\.accounts\\.dev', 'clerk\\.com'] },
  { name: 'Google Sign-In', category: 'authentication', website: 'https://developers.google.com/identity', src: ['accounts\\.google\\.com/gsi/client'] },
  { name: 'Sign in with Apple', category: 'authentication', website: 'https://developer.apple.com/sign-in-with-apple', src: ['appleid\\.cdn-apple\\.com'] },
]
