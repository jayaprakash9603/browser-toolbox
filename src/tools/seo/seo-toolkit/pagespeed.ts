const STORAGE_KEY = 'seo.pagespeedApiKey'

export interface PageSpeedResult {
  mobile: PageSpeedStrategy | null
  desktop: PageSpeedStrategy | null
  error?: string
}

export interface PageSpeedStrategy {
  score: number | null
  lcp?: string
  cls?: string
  inp?: string
  fcp?: string
  ttfb?: string
  opportunities: { title: string; description?: string }[]
}

export async function getPageSpeedApiKey(): Promise<string> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  return typeof stored[STORAGE_KEY] === 'string' ? stored[STORAGE_KEY] : ''
}

export async function setPageSpeedApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: key })
}

export async function fetchPageSpeedInsights(url: string, apiKey?: string): Promise<PageSpeedResult> {
  const key = apiKey ?? (await getPageSpeedApiKey())
  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
  const fetchStrategy = async (strategy: 'mobile' | 'desktop'): Promise<PageSpeedStrategy | null> => {
    const params = new URLSearchParams({ url, strategy, category: 'performance' })
    if (key) params.set('key', key)
    try {
      const res = await fetch(`${base}?${params}`)
      if (!res.ok) return null
      const json = (await res.json()) as {
        lighthouseResult?: {
          categories?: { performance?: { score?: number } }
          audits?: Record<
            string,
            { title?: string; description?: string; displayValue?: string; score?: number | null }
          >
        }
      }
      const lh = json.lighthouseResult
      if (!lh) return null
      const audits = lh.audits ?? {}
      const opportunities = Object.values(audits)
        .filter((a) => a.score != null && a.score < 1 && a.title)
        .slice(0, 5)
        .map((a) => ({ title: a.title!, description: a.description }))
      return {
        score: lh.categories?.performance?.score != null
          ? Math.round(lh.categories.performance.score * 100)
          : null,
        lcp: audits['largest-contentful-paint']?.displayValue,
        cls: audits['cumulative-layout-shift']?.displayValue,
        inp: audits['interaction-to-next-paint']?.displayValue,
        fcp: audits['first-contentful-paint']?.displayValue,
        ttfb: audits['server-response-time']?.displayValue,
        opportunities,
      }
    } catch {
      return null
    }
  }

  const [mobile, desktop] = await Promise.all([fetchStrategy('mobile'), fetchStrategy('desktop')])
  if (!mobile && !desktop) {
    return {
      mobile: null,
      desktop: null,
      error: key
        ? 'PageSpeed API request failed.'
        : 'PageSpeed API unavailable. Add an API key in Advanced or try again later.',
    }
  }
  return { mobile, desktop }
}
