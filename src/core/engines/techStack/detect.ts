export type TechHit = {
  name: string
  category: 'framework' | 'cms' | 'analytics' | 'cdn' | 'other'
  evidence: string
}

function scriptSrcIncludes(src: string, needle: string): boolean {
  return src.toLowerCase().includes(needle.toLowerCase())
}

export function detectTechFromPage(input: {
  scripts: string[]
  meta: Record<string, string>
  globals: string[]
  htmlSnippet: string
}): TechHit[] {
  const hits: TechHit[] = []
  const seen = new Set<string>()

  const add = (name: string, category: TechHit['category'], evidence: string) => {
    const key = `${category}:${name}`
    if (seen.has(key)) return
    seen.add(key)
    hits.push({ name, category, evidence })
  }

  for (const src of input.scripts) {
    if (scriptSrcIncludes(src, 'react')) add('React', 'framework', src)
    if (scriptSrcIncludes(src, 'vue')) add('Vue', 'framework', src)
    if (scriptSrcIncludes(src, 'angular')) add('Angular', 'framework', src)
    if (scriptSrcIncludes(src, 'svelte')) add('Svelte', 'framework', src)
    if (scriptSrcIncludes(src, 'next')) add('Next.js', 'framework', src)
    if (scriptSrcIncludes(src, 'nuxt')) add('Nuxt', 'framework', src)
    if (scriptSrcIncludes(src, 'shopify')) add('Shopify', 'cms', src)
    if (scriptSrcIncludes(src, 'wp-content') || scriptSrcIncludes(src, 'wordpress')) add('WordPress', 'cms', src)
    if (scriptSrcIncludes(src, 'googletagmanager') || scriptSrcIncludes(src, 'gtag')) add('Google Analytics / GTM', 'analytics', src)
    if (scriptSrcIncludes(src, 'facebook.net')) add('Meta Pixel', 'analytics', src)
    if (scriptSrcIncludes(src, 'cloudflare')) add('Cloudflare', 'cdn', src)
  }

  if (input.meta.generator?.toLowerCase().includes('wordpress')) add('WordPress', 'cms', 'meta generator')
  if (input.htmlSnippet.includes('cdn.shopify.com')) add('Shopify', 'cms', 'cdn.shopify.com')

  for (const g of input.globals) {
    if (g === '__NEXT_DATA__') add('Next.js', 'framework', 'window.__NEXT_DATA__')
    if (g === 'Shopify') add('Shopify', 'cms', 'window.Shopify')
    if (g.startsWith('webpackChunk')) add('Webpack', 'other', g)
  }

  return hits.sort((a, b) => a.name.localeCompare(b.name))
}
