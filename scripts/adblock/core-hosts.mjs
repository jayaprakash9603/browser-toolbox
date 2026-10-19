/**
 * Hand-curated ad, pop-under and push networks that must always be blocked, regardless of
 * how the generated filter lists are truncated. Subdomains are covered automatically
 * because DNR `requestDomains` matches a domain and all of its subdomains.
 *
 * Do NOT add hosts that sites need for normal operation (googletagmanager.com,
 * gstatic.com, cdn providers, imasdk.googleapis.com which video players rely on, ...).
 */

/** Blocked when requested from another site (third party), all resource types except pages. */
export const CORE_AD_HOSTS = [
  // Google ad stack
  'googlesyndication.com',
  'doubleclick.net',
  'googleadservices.com',
  'googletagservices.com',
  'adtrafficquality.google',
  'adservice.google.com',
  'adservice.google.co.in',
  'adservice.google.co.uk',
  'adservice.google.de',
  'adservice.google.fr',
  'adservice.google.ca',
  'adservice.google.com.au',
  'adservice.google.com.br',
  'adservice.google.es',
  'adservice.google.it',
  'adservice.google.nl',
  'adservice.google.ru',
  'adservice.google.co.jp',
  'partner.googleadservices.com',
  // Header bidding and exchanges
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'openx.com',
  'adnxs.com',
  'appnexus.com',
  'adsrvr.org',
  'casalemedia.com',
  'indexww.com',
  'contextweb.com',
  '33across.com',
  'sharethrough.com',
  'triplelift.com',
  'teads.tv',
  'smartadserver.com',
  'adform.net',
  'bidswitch.net',
  'lijit.com',
  'sovrn.com',
  'gumgum.com',
  '3lift.com',
  'yieldmo.com',
  'improvedigital.com',
  'adition.com',
  '360yield.com',
  'advertising.com',
  'adtech.com',
  'adroll.com',
  'media.net',
  'amazon-adsystem.com',
  'criteo.com',
  'criteo.net',
  'serving-sys.com',
  'flashtalking.com',
  'adsafeprotected.com',
  'moatads.com',
  'doubleverify.com',
  'quantserve.com',
  'bluekai.com',
  'exelator.com',
  'krxd.net',
  'rlcdn.com',
  'tapad.com',
  'agkn.com',
  'liadm.com',
  'id5-sync.com',
  'crwdcntrl.net',
  'eyeota.net',
  // Native and content recommendation ads
  'taboola.com',
  'taboolasyndication.com',
  'outbrain.com',
  'mgid.com',
  'revcontent.com',
  'zemanta.com',
  'adskeeper.com',
  'content.ad',
  'nativo.com',
  'ligatus.com',
  // Regional networks
  'an.yandex.ru',
  'yabs.yandex.ru',
  'ad.mail.ru',
  'adriver.ru',
  'begun.ru',
  'adfox.ru',
  // Display and video networks
  'adcolony.com',
  'unityads.unity3d.com',
  'adsymptotic.com',
  'spotxchange.com',
  'springserve.com',
  'tremorhub.com',
  'videoamp.com',
  'connatix.com',
  'primis.tech',
  'adsco.re',
  'a-ads.com',
  'coinzilla.io',
  'bidvertiser.com',
  'ad-maven.com',
  'admaven.com',
  'adcash.com',
]

/**
 * Pop-up, pop-under, push-spam and redirect networks. These are also blocked as top-level
 * navigations so a pop-under tab opened by a script never loads the advertiser page.
 */
export const POPUNDER_HOSTS = [
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'propeller-tracking.com',
  'onclickads.net',
  'onclkds.com',
  'adsterra.com',
  'adsterratools.com',
  'highperformanceformat.com',
  'highrevenuegate.com',
  'highrevenuenetwork.com',
  'effectivegatecpm.com',
  'profitablecpmrate.com',
  'profitablegatecpm.com',
  'exoclick.com',
  'exosrv.com',
  'exdynsrv.com',
  'juicyads.com',
  'trafficjunky.net',
  'clickadu.com',
  'hilltopads.net',
  'hilltopads.com',
  'monetag.com',
  'mondiad.com',
  'evadav.com',
  'galaksion.com',
  'clickaine.com',
  'richads.com',
  'pushhouse.io',
  'pushwhy.com',
  'notifpush.com',
  'pushnami.com',
  'adspyglass.com',
  'zeropark.com',
  'trafficstars.com',
  'tsyndicate.com',
  'ero-advertising.com',
  'plugrush.com',
  'popmyads.com',
  'dolohen.com',
  'syndication.exoclick.com',
]

const ALL_BLOCK_TYPES = [
  'script',
  'image',
  'stylesheet',
  'object',
  'xmlhttprequest',
  'sub_frame',
  'ping',
  'media',
  'font',
  'websocket',
  'other',
]

/** DNR rules (ids assigned later) for the curated hosts. */
export function buildCoreRules() {
  const rules = []
  for (let i = 0; i < CORE_AD_HOSTS.length; i += 400) {
    rules.push({
      priority: 1,
      action: { type: 'block' },
      condition: {
        requestDomains: CORE_AD_HOSTS.slice(i, i + 400),
        domainType: 'thirdParty',
        resourceTypes: ALL_BLOCK_TYPES,
      },
    })
  }
  rules.push({
    priority: 1,
    action: { type: 'block' },
    condition: {
      requestDomains: POPUNDER_HOSTS,
      resourceTypes: [...ALL_BLOCK_TYPES, 'main_frame'],
    },
  })
  return rules
}
