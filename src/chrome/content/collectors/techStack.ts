import { detectTechFromPage } from '@/core/engines/techStack/detect'

export function collectTechStack() {
  const scripts = [...document.scripts].map((s) => s.src || s.textContent?.slice(0, 80) || '')
  const meta: Record<string, string> = {}
  const gen = document.querySelector<HTMLMetaElement>('meta[name="generator"]')
  if (gen?.content) meta.generator = gen.content
  const globals: string[] = []
  for (const key of ['__NEXT_DATA__', 'Shopify', 'React', 'Vue', 'angular', 'webpackChunk']) {
    if (key in window) globals.push(key)
  }
  const htmlSnippet = document.documentElement.outerHTML.slice(0, 50_000)
  return detectTechFromPage({ scripts, meta, globals, htmlSnippet })
}
