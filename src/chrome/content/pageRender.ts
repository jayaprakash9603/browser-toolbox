const RENDER_FRAME_ATTR = 'data-one-panel-render'
const LOAD_TIMEOUT_MS = 15_000
const QUIET_MS = 800
const SETTLE_LIMIT_MS = 6_000

/**
 * Serializes the live DOM so it can be opened offline without its scripts. Rules that
 * CSS-in-JS libraries insert through the CSSOM never appear in `<style>` text, so they are
 * written back in; scripts and `<noscript>` fallbacks are dropped because the snapshot is
 * already the rendered result.
 */
export function serializeRenderedDocument(doc: Document): string {
  const ruleText = (sheet: CSSStyleSheet | null | undefined) => {
    try {
      return sheet ? [...sheet.cssRules].map((rule) => rule.cssText).join('\n') : ''
    } catch {
      return ''
    }
  }
  const injected = [...doc.querySelectorAll('style')].map((style) =>
    style.textContent?.trim() ? null : ruleText(style.sheet),
  )
  let adopted = ''
  try {
    adopted = [...(doc.adoptedStyleSheets ?? [])].map(ruleText).join('\n')
  } catch {
    /* adoptedStyleSheets unavailable */
  }

  const root = doc.documentElement.cloneNode(true) as HTMLElement
  root.querySelectorAll('style').forEach((style, index) => {
    const css = injected[index]
    if (css) style.textContent = css
  })
  root
    .querySelectorAll(
      `script:not([type="application/ld+json"]), noscript, link[rel="modulepreload"], link[rel="preload"][as="script"], iframe[${RENDER_FRAME_ATTR}]`,
    )
    .forEach((node) => node.remove())
  if (adopted) {
    const style = doc.createElement('style')
    style.setAttribute('data-adopted-styles', '')
    style.textContent = adopted
    ;(root.querySelector('head') ?? root).append(style)
  }
  return `<!DOCTYPE html>\n${root.outerHTML}`
}

function waitForQuiet(doc: Document, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let quietTimer = 0
    const finish = () => {
      window.clearTimeout(quietTimer)
      window.clearTimeout(limitTimer)
      observer.disconnect()
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const observer = new MutationObserver(() => {
      window.clearTimeout(quietTimer)
      quietTimer = window.setTimeout(finish, QUIET_MS)
    })
    observer.observe(doc, { childList: true, subtree: true, attributes: true, characterData: true })
    quietTimer = window.setTimeout(finish, QUIET_MS)
    const limitTimer = window.setTimeout(finish, SETTLE_LIMIT_MS)
    signal.addEventListener('abort', finish, { once: true })
  })
}

/**
 * Loads a same-origin page in a hidden frame so client-rendered apps (React, Vue, Angular…)
 * build their DOM, then snapshots it once mutations go quiet. The sandbox keeps the page from
 * navigating the user's tab or opening popups. Returns null when the site refuses framing.
 */
export async function renderPageInFrame(url: string, signal: AbortSignal): Promise<string | null> {
  if (signal.aborted) return null
  const frame = document.createElement('iframe')
  frame.setAttribute(RENDER_FRAME_ATTR, '')
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  Object.assign(frame.style, {
    position: 'fixed',
    left: '-12000px',
    top: '0',
    width: '1280px',
    height: '900px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })

  try {
    const loaded = new Promise<boolean>((resolve) => {
      const timer = window.setTimeout(() => resolve(false), LOAD_TIMEOUT_MS)
      const done = (ok: boolean) => {
        window.clearTimeout(timer)
        resolve(ok)
      }
      frame.addEventListener('load', () => done(true), { once: true })
      frame.addEventListener('error', () => done(false), { once: true })
      signal.addEventListener('abort', () => done(false), { once: true })
    })
    frame.src = url
    document.documentElement.append(frame)
    if (!(await loaded) || signal.aborted) return null

    let doc: Document | null = null
    try {
      doc = frame.contentDocument
    } catch {
      return null
    }
    if (!doc?.documentElement || doc.location.href === 'about:blank') return null
    await waitForQuiet(doc, signal)
    return signal.aborted ? null : serializeRenderedDocument(doc)
  } finally {
    frame.remove()
  }
}

/** Best guess at the front-end framework from markers that survive in the DOM. */
export function detectFramework(doc: Document): string | null {
  if (doc.getElementById('__next') || doc.getElementById('__NEXT_DATA__')) return 'Next.js'
  if (doc.getElementById('__nuxt') || doc.getElementById('__NUXT_DATA__')) return 'Nuxt'
  if (doc.getElementById('___gatsby')) return 'Gatsby'
  if (doc.querySelector('[ng-version]')) return 'Angular'
  if (doc.querySelector('astro-island')) return 'Astro'
  if (doc.querySelector('[data-v-app]')) return 'Vue'
  if (doc.querySelector('[data-reactroot]')) return 'React'
  if (doc.querySelector('[class*="svelte-"]')) return 'Svelte'
  const mount = doc.getElementById('root') ?? doc.getElementById('app')
  const bundled = doc.querySelector('script[type="module"], script[src*="bundle"], script[src*="main."]')
  if (mount && mount.childElementCount > 0 && bundled) return mount.id === 'root' ? 'React' : 'JavaScript app'
  return null
}
