export type PageType = 'home' | 'category' | 'blog' | 'product' | 'content'

const BLOG_SEGMENTS = new Set(['blog', 'blogs', 'posts', 'post', 'articles', 'article', 'news', 'journal'])
const PRODUCT_SEGMENTS = new Set(['product', 'products', 'item', 'items', 'p', 'dp', 'sku'])
const CATEGORY_SEGMENTS = new Set([
  'category',
  'categories',
  'collection',
  'collections',
  'shop',
  'store',
  'tag',
  'tags',
  'topic',
  'topics',
  'c',
])

export function classifyPageType(url: string): PageType {
  let pathname = '/'
  try {
    pathname = new URL(url).pathname
  } catch {
    return 'content'
  }
  const normalized = normalizePath(pathname)
  if (normalized === '/') return 'home'
  const segment = normalized.split('/').filter(Boolean)[0]?.toLowerCase() ?? ''
  if (BLOG_SEGMENTS.has(segment)) return 'blog'
  if (PRODUCT_SEGMENTS.has(segment)) return 'product'
  if (CATEGORY_SEGMENTS.has(segment)) return 'category'
  return 'content'
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/{2,}/g, '/').replace(/\/index\.html?$/i, '/')
  if (trimmed.length > 1 && trimmed.endsWith('/')) return trimmed.slice(0, -1)
  return trimmed || '/'
}
