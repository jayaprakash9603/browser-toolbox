import { validateJsonLd, flattenJsonLdTypes } from './schema'
import {
  averageSentenceLength,
  containsLorem,
  estimateTitlePixelWidth,
  keywordDensity,
  textToCodeRatio,
} from './text'
import type { SeoCheck, SeoNetworkContext, SeoPageData } from './types'

function check(partial: Omit<SeoCheck, 'ok'> & { ok?: boolean }): SeoCheck {
  const ok = partial.ok ?? (partial.severity === 'ok' || partial.severity === 'notice')
  return { ...partial, ok }
}

const GENERIC_ANCHORS = new Set(['click here', 'read more', 'here', 'more', 'link'])

const VALID_HREFLANG = /^[a-z]{2}(-[a-z]{2})?$/i

export function runAllSeoChecks(page: SeoPageData, network: SeoNetworkContext): SeoCheck[] {
  return [
    ...overviewChecks(page, network),
    ...headChecks(page, network),
    ...contentChecks(page),
    ...headingChecks(page),
    ...linkChecks(page),
    ...imageChecks(page),
    ...structuredChecks(page),
    ...socialChecks(page),
    ...hreflangChecks(page),
    ...performanceChecks(page, network),
  ]
}

function overviewChecks(page: SeoPageData, network: SeoNetworkContext): SeoCheck[] {
  const checks: SeoCheck[] = []
  const title = page.title.trim()
  const desc = page.metaDescription?.trim() ?? ''
  const h1 = page.headings.filter((h) => h.level === 1)

  checks.push(
    check({
      id: 'url-https',
      category: 'overview',
      severity: page.url.startsWith('https://') ? 'ok' : 'warning',
      weight: 2,
      message: page.url.startsWith('https://')
        ? 'Page uses HTTPS.'
        : 'Page is not served over HTTPS.',
      fix: 'Serve the site over HTTPS with a valid certificate.',
      tab: 'overview',
    }),
  )

  try {
    const u = new URL(page.url)
    checks.push(
      check({
        id: 'url-length',
        category: 'overview',
        severity: u.href.length <= 100 ? 'ok' : 'warning',
        weight: 1,
        message: `URL length is ${u.href.length} characters.`,
        tab: 'overview',
      }),
      check({
        id: 'url-uppercase',
        category: 'overview',
        severity: /[A-Z]/.test(u.pathname) ? 'warning' : 'ok',
        weight: 1,
        message: /[A-Z]/.test(u.pathname)
          ? 'URL path contains uppercase letters.'
          : 'URL path uses lowercase.',
        tab: 'overview',
      }),
      check({
        id: 'url-underscores',
        category: 'overview',
        severity: u.pathname.includes('_') ? 'warning' : 'ok',
        weight: 1,
        message: u.pathname.includes('_')
          ? 'URL uses underscores; hyphens are preferred.'
          : 'URL does not use underscores.',
        tab: 'overview',
      }),
      check({
        id: 'url-depth',
        category: 'overview',
        severity: u.pathname.split('/').filter(Boolean).length > 4 ? 'notice' : 'ok',
        weight: 1,
        message: `URL depth: ${u.pathname.split('/').filter(Boolean).length} segments.`,
        tab: 'overview',
      }),
      check({
        id: 'url-query',
        category: 'overview',
        severity: u.search ? 'notice' : 'ok',
        weight: 1,
        message: u.search ? 'URL contains query parameters.' : 'URL has no query string.',
        tab: 'overview',
      }),
    )
  } catch {
    /* invalid url */
  }

  if (network.statusCode != null) {
    checks.push(
      check({
        id: 'http-status',
        category: 'overview',
        severity: network.statusCode >= 200 && network.statusCode < 300 ? 'ok' : 'error',
        weight: 3,
        message: `HTTP status: ${network.statusCode}.`,
        tab: 'overview',
      }),
    )
  }
  if (network.redirectCount > 0) {
    checks.push(
      check({
        id: 'redirects',
        category: 'overview',
        severity: network.redirectCount > 2 ? 'warning' : 'notice',
        weight: 1,
        message: `${network.redirectCount} redirect(s) before final URL.`,
        tab: 'overview',
      }),
    )
  }

  checks.push(
    check({
      id: 'title',
      category: 'overview',
      severity: title.length === 0 ? 'error' : title.length > 60 ? 'warning' : 'ok',
      weight: 3,
      message:
        title.length === 0
          ? 'Missing <title>.'
          : `Title: ${title.length} chars (~${estimateTitlePixelWidth(title)}px).`,
      fix: 'Add a unique, descriptive title between 30–60 characters.',
      tab: 'overview',
    }),
    check({
      id: 'title-pixel',
      category: 'overview',
      severity: estimateTitlePixelWidth(title) > 580 ? 'warning' : 'ok',
      weight: 1,
      message: `Estimated title width in SERP: ~${estimateTitlePixelWidth(title)}px.`,
      tab: 'overview',
    }),
    check({
      id: 'description',
      category: 'overview',
      severity: desc.length === 0 ? 'error' : desc.length > 160 ? 'warning' : 'ok',
      weight: 3,
      message:
        desc.length === 0
          ? 'Missing meta description.'
          : `Meta description: ${desc.length} characters.`,
      fix: 'Write a compelling meta description around 120–160 characters.',
      tab: 'overview',
    }),
    check({
      id: 'canonical',
      category: 'overview',
      severity: page.canonical ? 'ok' : 'warning',
      weight: 2,
      message: page.canonical ? 'Canonical URL is set.' : 'No canonical link.',
      tab: 'overview',
    }),
  )

  if (page.canonical) {
    const selfRef = page.canonical === page.url || page.canonical === network.finalUrl
    checks.push(
      check({
        id: 'canonical-self',
        category: 'overview',
        severity: selfRef ? 'ok' : 'notice',
        weight: 1,
        message: selfRef ? 'Canonical is self-referencing.' : 'Canonical points to another URL.',
        tab: 'overview',
      }),
      check({
        id: 'canonical-absolute',
        category: 'overview',
        severity: page.canonical.startsWith('http') ? 'ok' : 'error',
        weight: 2,
        message: page.canonical.startsWith('http')
          ? 'Canonical uses an absolute URL.'
          : 'Canonical should be absolute.',
        tab: 'overview',
      }),
    )
    const ogUrl = page.openGraph['og:url']
    if (ogUrl) {
      checks.push(
        check({
          id: 'canonical-og-match',
          category: 'overview',
          severity: ogUrl === page.canonical ? 'ok' : 'warning',
          weight: 1,
          message: ogUrl === page.canonical ? 'og:url matches canonical.' : 'og:url differs from canonical.',
          tab: 'overview',
        }),
      )
    }
  }

  const robots = (page.metaRobots ?? '').toLowerCase()
  const xRobots = (network.xRobotsTag ?? '').toLowerCase()
  const noindex = robots.includes('noindex') || xRobots.includes('noindex')
  checks.push(
    check({
      id: 'meta-robots',
      category: 'overview',
      severity: page.metaRobots ? 'ok' : 'notice',
      weight: 1,
      message: page.metaRobots ? `meta robots: ${page.metaRobots}` : 'No meta robots tag.',
      tab: 'overview',
    }),
    check({
      id: 'indexable',
      category: 'overview',
      severity: noindex ? 'error' : 'ok',
      weight: 3,
      message: noindex ? 'Page is marked noindex.' : 'Page is indexable (no noindex).',
      tab: 'overview',
    }),
  )
  if (robots.includes('nofollow')) {
    checks.push(
      check({
        id: 'robots-nofollow',
        category: 'overview',
        severity: 'warning',
        weight: 1,
        message: 'meta robots includes nofollow.',
        tab: 'overview',
      }),
    )
  }
  if (network.xRobotsTag) {
    checks.push(
      check({
        id: 'x-robots',
        category: 'overview',
        severity: 'notice',
        weight: 1,
        message: `X-Robots-Tag: ${network.xRobotsTag}`,
        tab: 'overview',
      }),
    )
  }
  if (network.robotsAllowsUrl === false) {
    checks.push(
      check({
        id: 'robots-txt-block',
        category: 'overview',
        severity: 'error',
        weight: 3,
        message: 'robots.txt disallows this URL.',
        fix: 'Update robots.txt or remove disallow for this path.',
        tab: 'overview',
      }),
    )
  } else if (network.robotsAllowsUrl === true) {
    checks.push(
      check({
        id: 'robots-txt-allow',
        category: 'overview',
        severity: 'ok',
        weight: 1,
        message: 'robots.txt allows crawling this URL.',
        tab: 'overview',
      }),
    )
  }
  if (network.sitemapContainsUrl === true) {
    checks.push(
      check({
        id: 'in-sitemap',
        category: 'overview',
        severity: 'ok',
        weight: 1,
        message: 'URL found in sitemap.',
        tab: 'overview',
      }),
    )
  } else if (network.sitemapContainsUrl === false) {
    checks.push(
      check({
        id: 'not-in-sitemap',
        category: 'overview',
        severity: 'notice',
        weight: 1,
        message: 'URL not found in sitemap (or sitemap unavailable).',
        tab: 'overview',
      }),
    )
  }

  if (h1.length > 0 && title && h1[0].text.toLowerCase() === title.toLowerCase()) {
    checks.push(
      check({
        id: 'title-h1-duplicate',
        category: 'overview',
        severity: 'notice',
        weight: 1,
        message: 'Title and H1 text are identical.',
        tab: 'overview',
      }),
    )
  }

  return checks
}

function headChecks(page: SeoPageData, network: SeoNetworkContext): SeoCheck[] {
  return [
    check({
      id: 'charset',
      category: 'head',
      severity: page.charset ? 'ok' : 'warning',
      weight: 1,
      message: page.charset ? `Charset: ${page.charset}.` : 'Charset not detected.',
      tab: 'overview',
    }),
    check({
      id: 'viewport',
      category: 'head',
      severity: page.viewport ? 'ok' : 'error',
      weight: 2,
      message: page.viewport ? 'Viewport meta is set.' : 'Missing viewport meta.',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
      tab: 'overview',
    }),
    check({
      id: 'lang',
      category: 'head',
      severity: page.language ? 'ok' : 'warning',
      weight: 2,
      message: page.language ? `lang="${page.language}".` : 'Missing lang on <html>.',
      tab: 'overview',
    }),
    check({
      id: 'favicon',
      category: 'head',
      severity: page.favicon ? 'ok' : 'notice',
      weight: 1,
      message: page.favicon ? 'Favicon is linked.' : 'No favicon link found.',
      tab: 'advanced',
    }),
    check({
      id: 'apple-touch',
      category: 'head',
      severity: page.appleTouchIcon ? 'ok' : 'notice',
      weight: 1,
      message: page.appleTouchIcon ? 'Apple touch icon present.' : 'No apple-touch-icon.',
      tab: 'advanced',
    }),
    check({
      id: 'theme-color',
      category: 'head',
      severity: page.themeColor ? 'ok' : 'notice',
      weight: 1,
      message: page.themeColor ? `theme-color: ${page.themeColor}` : 'No theme-color meta.',
      tab: 'advanced',
    }),
    check({
      id: 'manifest',
      category: 'head',
      severity: page.manifest ? 'ok' : 'notice',
      weight: 1,
      message: page.manifest ? 'Web app manifest linked.' : 'No manifest link.',
      tab: 'advanced',
    }),
    check({
      id: 'doctype',
      category: 'head',
      severity: page.doctype ? 'ok' : 'warning',
      weight: 1,
      message: page.doctype || 'Doctype missing or HTML5 default.',
      tab: 'advanced',
    }),
    check({
      id: 'meta-keywords',
      category: 'head',
      severity: page.metaKeywords ? 'notice' : 'ok',
      weight: 1,
      message: page.metaKeywords
        ? 'meta keywords present (ignored by major search engines).'
        : 'No deprecated meta keywords.',
      tab: 'advanced',
    }),
    check({
      id: 'meta-refresh',
      category: 'head',
      severity: page.metaRefresh ? 'warning' : 'ok',
      weight: 2,
      message: page.metaRefresh ? 'Meta refresh redirect detected.' : 'No meta refresh.',
      tab: 'advanced',
    }),
    check({
      id: 'page-size',
      category: 'head',
      severity: page.htmlBytes > 2_000_000 ? 'warning' : 'ok',
      weight: 1,
      message: `HTML size: ${Math.round(page.htmlBytes / 1024)} KB.`,
      tab: 'content',
    }),
    check({
      id: 'compression',
      category: 'head',
      severity: network.contentEncoding ? 'ok' : 'notice',
      weight: 1,
      message: network.contentEncoding
        ? `Content-Encoding: ${network.contentEncoding}`
        : 'No compression header detected on document response.',
      tab: 'performance',
    }),
    check({
      id: 'cache-control',
      category: 'head',
      severity: network.cacheControl ? 'ok' : 'notice',
      weight: 1,
      message: network.cacheControl ? `Cache-Control: ${network.cacheControl}` : 'No Cache-Control on document.',
      tab: 'performance',
    }),
    check({
      id: 'render-blocking',
      category: 'head',
      severity: page.renderBlockingScriptsInHead > 3 ? 'warning' : 'ok',
      weight: 1,
      message: `${page.renderBlockingScriptsInHead} render-blocking script(s) in <head>.`,
      tab: 'performance',
    }),
    check({
      id: 'script-count',
      category: 'head',
      severity: page.scriptCount > 40 ? 'warning' : 'ok',
      weight: 1,
      message: `${page.scriptCount} script tags on page.`,
      tab: 'performance',
    }),
    check({
      id: 'stylesheet-count',
      category: 'head',
      severity: page.stylesheetCount > 20 ? 'warning' : 'ok',
      weight: 1,
      message: `${page.stylesheetCount} stylesheet links.`,
      tab: 'performance',
    }),
    check({
      id: 'inline-css',
      category: 'head',
      severity: page.inlineStyleBytes > 50_000 ? 'warning' : 'ok',
      weight: 1,
      message: `Inline CSS: ${Math.round(page.inlineStyleBytes / 1024)} KB.`,
      tab: 'performance',
    }),
    check({
      id: 'iframes',
      category: 'head',
      severity: page.iframeCount > 5 ? 'notice' : 'ok',
      weight: 1,
      message: `${page.iframeCount} iframe(s).`,
      tab: 'advanced',
    }),
    check({
      id: 'legacy-embed',
      category: 'head',
      severity: page.embedCount + page.objectCount > 0 ? 'warning' : 'ok',
      weight: 1,
      message:
        page.embedCount + page.objectCount > 0
          ? 'Legacy embed/object elements found.'
          : 'No embed/object elements.',
      tab: 'advanced',
    }),
    check({
      id: 'amp',
      category: 'head',
      severity: page.ampHtml ? 'notice' : 'ok',
      weight: 1,
      message: page.ampHtml ? 'AMP alternate link present.' : 'No AMP alternate.',
      tab: 'advanced',
    }),
    check({
      id: 'pagination',
      category: 'head',
      severity: page.paginationPrev || page.paginationNext ? 'ok' : 'notice',
      weight: 1,
      message:
        page.paginationPrev || page.paginationNext
          ? 'rel=prev/next pagination links found.'
          : 'No pagination rel links.',
      tab: 'advanced',
    }),
  ]
}

function contentChecks(page: SeoPageData): SeoCheck[] {
  const ratio = textToCodeRatio(page.charCount, page.htmlBytes)
  const topKw = keywordDensity(page.bodyText, 1, 1)[0]
  const h1 = page.headings.find((h) => h.level === 1)?.text ?? ''
  const title = page.title.trim()
  const desc = page.metaDescription?.trim() ?? ''

  const checks: SeoCheck[] = [
    check({
      id: 'word-count',
      category: 'content',
      severity: page.wordCount < 300 ? 'warning' : 'ok',
      weight: 2,
      message: `${page.wordCount} words of visible text.`,
      fix: page.wordCount < 300 ? 'Add more substantive content for topical relevance.' : undefined,
      tab: 'content',
    }),
    check({
      id: 'char-count',
      category: 'content',
      severity: 'ok',
      weight: 1,
      message: `${page.charCount} characters of visible text.`,
      tab: 'content',
    }),
    check({
      id: 'text-ratio',
      category: 'content',
      severity: ratio < 10 ? 'warning' : 'ok',
      weight: 2,
      message: `Text-to-code ratio: ${ratio}%.`,
      tab: 'content',
    }),
    check({
      id: 'readability',
      category: 'content',
      severity: averageSentenceLength(page.bodyText) > 25 ? 'notice' : 'ok',
      weight: 1,
      message: `Average sentence length: ${averageSentenceLength(page.bodyText)} words.`,
      tab: 'content',
    }),
    check({
      id: 'lorem',
      category: 'content',
      severity: containsLorem(page.bodyText) ? 'warning' : 'ok',
      weight: 1,
      message: containsLorem(page.bodyText) ? 'Placeholder lorem ipsum text detected.' : 'No lorem ipsum detected.',
      tab: 'content',
    }),
  ]

  if (topKw) {
    checks.push(
      check({
        id: 'top-keyword',
        category: 'content',
        severity: 'ok',
        weight: 1,
        message: `Top keyword: "${topKw.phrase}" (${topKw.density}% density).`,
        tab: 'content',
      }),
    )
    if (h1 && !h1.toLowerCase().includes(topKw.phrase)) {
      checks.push(
        check({
          id: 'h1-keyword',
          category: 'content',
          severity: 'notice',
          weight: 1,
          message: 'H1 does not contain the top keyword phrase.',
          tab: 'content',
        }),
      )
    }
    if (title && !title.toLowerCase().includes(topKw.phrase)) {
      checks.push(
        check({
          id: 'title-keyword',
          category: 'content',
          severity: 'notice',
          weight: 1,
          message: 'Title does not contain the top keyword phrase.',
          tab: 'content',
        }),
      )
    }
    if (desc && !desc.toLowerCase().includes(topKw.phrase)) {
      checks.push(
        check({
          id: 'desc-keyword',
          category: 'content',
          severity: 'notice',
          weight: 1,
          message: 'Meta description does not contain the top keyword phrase.',
          tab: 'content',
        }),
      )
    }
  }

  return checks
}

function headingChecks(page: SeoPageData): SeoCheck[] {
  const checks: SeoCheck[] = []
  const h1Count = page.headings.filter((h) => h.level === 1).length
  checks.push(
    check({
      id: 'h1-count',
      category: 'headings',
      severity: h1Count === 0 ? 'error' : h1Count > 1 ? 'warning' : 'ok',
      weight: 3,
      message:
        h1Count === 0
          ? 'No H1 on the page.'
          : h1Count > 1
            ? `${h1Count} H1 elements — use one main H1.`
            : 'Single H1 present.',
      tab: 'headings',
    }),
  )

  for (let i = 1; i < page.headings.length; i += 1) {
    if (page.headings[i].level > page.headings[i - 1].level + 1) {
      checks.push(
        check({
          id: `heading-skip-${i}`,
          category: 'headings',
          severity: 'warning',
          weight: 1,
          message: `Heading skips from H${page.headings[i - 1].level} to H${page.headings[i].level}.`,
          tab: 'headings',
        }),
      )
    }
  }

  const seen = new Map<string, number>()
  for (const h of page.headings) {
    if (!h.text.trim()) {
      checks.push(
        check({
          id: `heading-empty-${h.index}`,
          category: 'headings',
          severity: 'warning',
          weight: 1,
          message: `Empty H${h.level}.`,
          tab: 'headings',
        }),
      )
    }
    if (h.text.length > 120) {
      checks.push(
        check({
          id: `heading-long-${h.index}`,
          category: 'headings',
          severity: 'notice',
          weight: 1,
          message: `Very long H${h.level} (${h.text.length} chars).`,
          tab: 'headings',
        }),
      )
    }
    const key = h.text.toLowerCase()
    if (key) {
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
  }
  const dupes = [...seen.values()].filter((c) => c > 1).length
  if (dupes > 0) {
    checks.push(
      check({
        id: 'heading-duplicates',
        category: 'headings',
        severity: 'notice',
        weight: 1,
        message: 'Duplicate heading text found.',
        tab: 'headings',
      }),
    )
  }

  for (let level = 1; level <= 6; level += 1) {
    const count = page.headings.filter((h) => h.level === level).length
    checks.push(
      check({
        id: `h${level}-count`,
        category: 'headings',
        severity: 'ok',
        weight: 0,
        message: `H${level}: ${count}`,
        tab: 'headings',
      }),
    )
  }

  return checks
}

function linkChecks(page: SeoPageData): SeoCheck[] {
  const hrefs = page.links.map((l) => l.href)
  const unique = new Set(hrefs)
  const internal = page.links.filter((l) => l.internal).length
  const external = page.links.filter((l) => !l.internal && !l.subdomain).length
  const subdomain = page.links.filter((l) => l.subdomain).length
  const nofollow = page.links.filter((l) => l.nofollow).length
  const empty = page.links.filter((l) => !l.text.trim()).length
  const generic = page.links.filter((l) => GENERIC_ANCHORS.has(l.text.toLowerCase())).length
  const jsLinks = page.links.filter((l) => l.href.startsWith('javascript:')).length
  const hashOnly = page.links.filter((l) => l.href.endsWith('#') || l.href.includes('#') && l.href.split('#')[0] === page.url.split('#')[0]).length
  const mailtel = page.links.filter((l) => l.href.startsWith('mailto:') || l.href.startsWith('tel:')).length
  const blankNoOpener = page.links.filter(
    (l) => l.targetBlank && !l.rel.includes('noopener') && !l.rel.includes('noreferrer'),
  ).length

  return [
    check({ id: 'links-total', category: 'links', severity: 'ok', weight: 0, message: `${page.links.length} total links.`, tab: 'links' }),
    check({ id: 'links-unique', category: 'links', severity: 'ok', weight: 0, message: `${unique.size} unique URLs.`, tab: 'links' }),
    check({ id: 'links-internal', category: 'links', severity: 'ok', weight: 0, message: `${internal} internal links.`, tab: 'links' }),
    check({ id: 'links-external', category: 'links', severity: 'ok', weight: 0, message: `${external} external links.`, tab: 'links' }),
    check({ id: 'links-subdomain', category: 'links', severity: 'ok', weight: 0, message: `${subdomain} subdomain links.`, tab: 'links' }),
    check({
      id: 'links-nofollow',
      category: 'links',
      severity: 'ok',
      weight: 0,
      message: `${nofollow} nofollow links.`,
      tab: 'links',
    }),
    check({
      id: 'links-empty-anchor',
      category: 'links',
      severity: empty > 0 ? 'warning' : 'ok',
      weight: 2,
      message: empty > 0 ? `${empty} links with empty anchor text.` : 'All links have anchor text.',
      tab: 'links',
    }),
    check({
      id: 'links-generic',
      category: 'links',
      severity: generic > 0 ? 'notice' : 'ok',
      weight: 1,
      message: generic > 0 ? `${generic} generic anchor(s) ("click here", etc.).` : 'No generic anchors.',
      tab: 'links',
    }),
    check({
      id: 'links-js',
      category: 'links',
      severity: jsLinks > 0 ? 'notice' : 'ok',
      weight: 1,
      message: jsLinks > 0 ? `${jsLinks} javascript: links.` : 'No javascript: links.',
      tab: 'links',
    }),
    check({
      id: 'links-hash',
      category: 'links',
      severity: 'ok',
      weight: 0,
      message: `${hashOnly} in-page hash links.`,
      tab: 'links',
    }),
    check({
      id: 'links-mailtel',
      category: 'links',
      severity: 'ok',
      weight: 0,
      message: `${mailtel} mailto/tel links.`,
      tab: 'links',
    }),
    check({
      id: 'links-blank-opener',
      category: 'links',
      severity: blankNoOpener > 0 ? 'warning' : 'ok',
      weight: 1,
      message:
        blankNoOpener > 0
          ? `${blankNoOpener} target=_blank without noopener/noreferrer.`
          : 'target=_blank links use noopener or noreferrer.',
      tab: 'links',
    }),
    check({
      id: 'links-duplicates',
      category: 'links',
      severity: page.links.length - unique.size > 10 ? 'notice' : 'ok',
      weight: 1,
      message: `${page.links.length - unique.size} duplicate link URLs.`,
      tab: 'links',
    }),
  ]
}

function imageChecks(page: SeoPageData): SeoCheck[] {
  const missingAlt = page.images.filter((i) => i.alt === null).length
  const emptyAlt = page.images.filter((i) => i.alt === '').length
  const missingTitle = page.images.filter((i) => !i.title?.trim()).length
  const noDimensions = page.images.filter((i) => !i.hasWidthAttr && !i.hasHeightAttr).length
  const oversized = page.images.filter((i) => i.width > 2000 || i.height > 2000).length
  const legacy = page.images.filter((i) => /\.(bmp|tiff?)$/i.test(i.src)).length
  const lazy = page.images.filter((i) => i.loading === 'lazy').length

  return [
    check({ id: 'images-total', category: 'images', severity: 'ok', weight: 0, message: `${page.images.length} images.`, tab: 'images' }),
    check({
      id: 'images-missing-alt',
      category: 'images',
      severity: missingAlt > 0 ? 'error' : 'ok',
      weight: 3,
      message: missingAlt > 0 ? `${missingAlt} images missing alt attribute.` : 'All images have alt attribute.',
      tab: 'images',
    }),
    check({
      id: 'images-empty-alt',
      category: 'images',
      severity: emptyAlt > 0 ? 'warning' : 'ok',
      weight: 1,
      message: emptyAlt > 0 ? `${emptyAlt} images with empty alt.` : 'No empty alt attributes.',
      tab: 'images',
    }),
    check({
      id: 'images-title',
      category: 'images',
      severity: missingTitle > page.images.length / 2 ? 'notice' : 'ok',
      weight: 1,
      message: `${missingTitle} images without title attribute.`,
      tab: 'images',
    }),
    check({
      id: 'images-dimensions',
      category: 'images',
      severity: noDimensions > 0 ? 'warning' : 'ok',
      weight: 2,
      message:
        noDimensions > 0
          ? `${noDimensions} images missing width/height (CLS risk).`
          : 'Images specify dimensions.',
      tab: 'images',
    }),
    check({
      id: 'images-oversized',
      category: 'images',
      severity: oversized > 0 ? 'warning' : 'ok',
      weight: 1,
      message: oversized > 0 ? `${oversized} oversized images (>2000px).` : 'No oversized images.',
      tab: 'images',
    }),
    check({
      id: 'images-legacy-format',
      category: 'images',
      severity: legacy > 0 ? 'notice' : 'ok',
      weight: 1,
      message: legacy > 0 ? `${legacy} legacy image format(s).` : 'No BMP/TIFF images.',
      tab: 'images',
    }),
    check({
      id: 'images-lazy',
      category: 'images',
      severity: 'ok',
      weight: 0,
      message: `${lazy} images use loading=lazy.`,
      tab: 'images',
    }),
  ]
}

function structuredChecks(page: SeoPageData): SeoCheck[] {
  const types = flattenJsonLdTypes(page.jsonLd)
  const issues = validateJsonLd(page.jsonLd)
  const checks: SeoCheck[] = [
    check({
      id: 'jsonld-present',
      category: 'structured',
      severity: page.jsonLd.length > 0 ? 'ok' : 'notice',
      weight: 2,
      message: page.jsonLd.length > 0 ? `${page.jsonLd.length} JSON-LD block(s).` : 'No JSON-LD found.',
      tab: 'schema',
    }),
    check({
      id: 'microdata',
      category: 'structured',
      severity: page.microdataItemCount > 0 ? 'ok' : 'notice',
      weight: 1,
      message: `${page.microdataItemCount} microdata itemscope(s).`,
      tab: 'schema',
    }),
    check({
      id: 'rdfa',
      category: 'structured',
      severity: page.rdfaCount > 0 ? 'ok' : 'notice',
      weight: 1,
      message: `${page.rdfaCount} RDFa typeof nodes.`,
      tab: 'schema',
    }),
  ]
  if (types.length > 0) {
    checks.push(
      check({
        id: 'schema-types',
        category: 'structured',
        severity: 'ok',
        weight: 1,
        message: `Schema types: ${types.join(', ')}.`,
        tab: 'schema',
      }),
    )
  }
  for (const issue of issues) {
    if (issue.parseError) {
      checks.push(
        check({
          id: 'jsonld-parse',
          category: 'structured',
          severity: 'error',
          weight: 2,
          message: `JSON-LD parse error: ${issue.parseError}`,
          tab: 'schema',
        }),
      )
    } else if (issue.missing.length > 0) {
      checks.push(
        check({
          id: `schema-${issue.type}`,
          category: 'structured',
          severity: 'warning',
          weight: 1,
          message: `${issue.type} missing: ${issue.missing.join(', ')}.`,
          tab: 'schema',
        }),
      )
    }
  }
  return checks
}

function socialChecks(page: SeoPageData): SeoCheck[] {
  const requiredOg = ['og:title', 'og:description', 'og:image', 'og:url']
  const missingOg = requiredOg.filter((k) => !page.openGraph[k])
  const checks: SeoCheck[] = [
    check({
      id: 'og-present',
      category: 'social',
      severity: Object.keys(page.openGraph).length > 0 ? 'ok' : 'warning',
      weight: 2,
      message:
        Object.keys(page.openGraph).length > 0
          ? `${Object.keys(page.openGraph).length} Open Graph tags.`
          : 'No Open Graph tags.',
      tab: 'social',
    }),
    check({
      id: 'og-complete',
      category: 'social',
      severity: missingOg.length === 0 ? 'ok' : 'warning',
      weight: 2,
      message:
        missingOg.length === 0
          ? 'Core Open Graph tags present.'
          : `Missing og: ${missingOg.map((k) => k.replace('og:', '')).join(', ')}.`,
      tab: 'social',
    }),
    check({
      id: 'twitter-present',
      category: 'social',
      severity: Object.keys(page.twitter).length > 0 ? 'ok' : 'notice',
      weight: 1,
      message:
        Object.keys(page.twitter).length > 0
          ? `${Object.keys(page.twitter).length} Twitter card tags.`
          : 'No Twitter card meta.',
      tab: 'social',
    }),
  ]
  if (page.openGraph['og:type']) {
    checks.push(
      check({
        id: 'og-type',
        category: 'social',
        severity: 'ok',
        weight: 0,
        message: `og:type = ${page.openGraph['og:type']}`,
        tab: 'social',
      }),
    )
  }
  if (page.twitter['twitter:card']) {
    checks.push(
      check({
        id: 'twitter-card',
        category: 'social',
        severity: 'ok',
        weight: 0,
        message: `twitter:card = ${page.twitter['twitter:card']}`,
        tab: 'social',
      }),
    )
  }
  return checks
}

function hreflangChecks(page: SeoPageData): SeoCheck[] {
  if (page.hreflangs.length === 0) {
    return [
      check({
        id: 'hreflang-none',
        category: 'hreflang',
        severity: 'notice',
        weight: 1,
        message: 'No hreflang alternate links.',
        tab: 'schema',
      }),
    ]
  }
  const langs = page.hreflangs.map((h) => h.hreflang.toLowerCase())
  const dupes = langs.length - new Set(langs).size
  const hasXDefault = langs.includes('x-default')
  const hasSelf = page.hreflangs.some(
    (h) => h.href === page.url || h.hreflang.toLowerCase() === page.language.toLowerCase(),
  )
  const invalid = page.hreflangs.filter((h) => h.hreflang !== 'x-default' && !VALID_HREFLANG.test(h.hreflang))
  const relative = page.hreflangs.filter((h) => !h.href.startsWith('http'))

  return [
    check({
      id: 'hreflang-count',
      category: 'hreflang',
      severity: 'ok',
      weight: 1,
      message: `${page.hreflangs.length} hreflang entries.`,
      tab: 'schema',
    }),
    check({
      id: 'hreflang-x-default',
      category: 'hreflang',
      severity: hasXDefault ? 'ok' : 'warning',
      weight: 1,
      message: hasXDefault ? 'x-default hreflang present.' : 'Missing x-default hreflang.',
      tab: 'schema',
    }),
    check({
      id: 'hreflang-self',
      category: 'hreflang',
      severity: hasSelf ? 'ok' : 'warning',
      weight: 1,
      message: hasSelf ? 'Self-referencing hreflang found.' : 'No self-referencing hreflang.',
      tab: 'schema',
    }),
    check({
      id: 'hreflang-dupes',
      category: 'hreflang',
      severity: dupes > 0 ? 'error' : 'ok',
      weight: 2,
      message: dupes > 0 ? 'Duplicate hreflang language codes.' : 'Hreflang languages are unique.',
      tab: 'schema',
    }),
    check({
      id: 'hreflang-invalid',
      category: 'hreflang',
      severity: invalid.length > 0 ? 'warning' : 'ok',
      weight: 1,
      message:
        invalid.length > 0
          ? `${invalid.length} invalid hreflang code(s).`
          : 'Hreflang codes look valid.',
      tab: 'schema',
    }),
    check({
      id: 'hreflang-absolute',
      category: 'hreflang',
      severity: relative.length > 0 ? 'warning' : 'ok',
      weight: 1,
      message: relative.length > 0 ? 'Hreflang URLs should be absolute.' : 'Hreflang URLs are absolute.',
      tab: 'schema',
    }),
  ]
}

function performanceChecks(page: SeoPageData, network: SeoNetworkContext): SeoCheck[] {
  const checks: SeoCheck[] = []
  if (page.performance.ttfb != null) {
    checks.push(
      check({
        id: 'local-ttfb',
        category: 'performance',
        severity: page.performance.ttfb > 600 ? 'warning' : 'ok',
        weight: 2,
        message: `Local TTFB: ${Math.round(page.performance.ttfb)} ms.`,
        tab: 'performance',
      }),
    )
  }
  if (page.performance.domContentLoaded != null) {
    checks.push(
      check({
        id: 'local-dcl',
        category: 'performance',
        severity: page.performance.domContentLoaded > 3000 ? 'warning' : 'ok',
        weight: 1,
        message: `DOMContentLoaded: ${Math.round(page.performance.domContentLoaded)} ms.`,
        tab: 'performance',
      }),
    )
  }
  if (network.contentLength != null) {
    checks.push(
      check({
        id: 'response-size',
        category: 'performance',
        severity: network.contentLength > 1_500_000 ? 'warning' : 'ok',
        weight: 1,
        message: `Document response size: ${Math.round(network.contentLength / 1024)} KB.`,
        tab: 'performance',
      }),
    )
  }
  return checks
}
