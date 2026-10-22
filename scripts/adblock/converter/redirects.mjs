/**
 * uBO redirect resource names (and their aliases) mapped onto the neutered files packaged in
 * public/adblock/redirects. Names that are not listed fall back to a plain block.
 */
const RESOURCES = {
  'noop.js': ['noopjs', 'noop.js', 'abp-resource:blank-js'],
  'noop.txt': ['nooptext', 'noop.txt', 'empty', 'abp-resource:blank-text'],
  'noop.html': ['noopframe', 'noop.html', 'abp-resource:blank-html'],
  'noop.css': ['noopcss', 'noop.css', 'abp-resource:blank-css'],
  '1x1.gif': ['1x1-transparent.gif', '1x1.gif', 'abp-resource:1x1-transparent-gif'],
  '1x1.png': [
    '2x2-transparent.png',
    '2x2.png',
    '3x2-transparent.png',
    '3x2.png',
    '32x32-transparent.png',
    '32x32.png',
    'abp-resource:2x2-transparent-png',
    'abp-resource:3x2-transparent-png',
    'abp-resource:32x32-transparent-png',
  ],
  'googlesyndication_adsbygoogle.js': [
    'googlesyndication_adsbygoogle.js',
    'googlesyndication.com/adsbygoogle.js',
  ],
  'googletagservices_gpt.js': ['googletagservices_gpt.js', 'googletagservices.com/gpt.js'],
  'google-analytics_analytics.js': [
    'google-analytics_analytics.js',
    'google-analytics.com/analytics.js',
    'googletagmanager_gtm.js',
    'googletagmanager.com/gtm.js',
  ],
  'google-analytics_ga.js': ['google-analytics_ga.js', 'google-analytics.com/ga.js'],
  'amazon_apstag.js': ['amazon_apstag.js'],
  'scorecardresearch_beacon.js': ['scorecardresearch_beacon.js', 'scorecardresearch.com/beacon.js'],
  'fuckadblock.js': ['fuckadblock.js-3.2.0', 'fuckadblock.js', 'nofab.js', 'nobab.js'],
}

const ALIASES = new Map()
for (const [file, names] of Object.entries(RESOURCES)) {
  for (const name of names) ALIASES.set(name, file)
}

export const REDIRECT_FILES = Object.keys(RESOURCES)

export function resolveRedirect(name) {
  const file = ALIASES.get(name)
  return file ? `/adblock/redirects/${file}` : null
}
