export interface PageMeta {
  canonical: string | null
  robots: string | null
}

export function extractPageMeta(doc: Document, pageUrl: string): PageMeta {
  return {
    canonical: resolveCanonical(doc, pageUrl),
    robots: metaRobots(doc),
  }
}

function resolveCanonical(doc: Document, pageUrl: string): string | null {
  const href = doc.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim()
  if (!href) return null
  try {
    return new URL(href, pageUrl).href
  } catch {
    return href
  }
}

function metaRobots(doc: Document): string | null {
  const nodes = [...doc.querySelectorAll('meta[name]')]
  const robots = nodes.find((node) => node.getAttribute('name')?.toLowerCase() === 'robots')
  const content = robots?.getAttribute('content')?.trim()
  return content || null
}

export function anchorHasImage(anchor: Element): boolean {
  return Boolean(anchor.querySelector('img, svg, [role="img"]'))
}
