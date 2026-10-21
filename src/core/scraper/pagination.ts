const NEXT_TEXT = /^(next|›|»|→|>|\u203a|\u00bb)$/i
const NEXT_PHRASE = /next\s*(page|›|»)?/i

export interface PaginationCandidate {
  selector: string
  score: number
  element: Element
}

function isDisabled(el: Element): boolean {
  if (el.hasAttribute('disabled')) return true
  if (el.getAttribute('aria-disabled') === 'true') return true
  if (el.classList.contains('disabled')) return true
  const parent = el.closest('[aria-disabled="true"], .disabled')
  return Boolean(parent && parent !== el)
}

function scoreLink(el: Element): number {
  if (isDisabled(el)) return -1
  let score = 0
  const rel = el.getAttribute('rel')
  if (rel?.toLowerCase().includes('next')) score += 100
  const aria = (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? '').toLowerCase()
  if (NEXT_PHRASE.test(aria)) score += 80
  const text = (el.textContent ?? '').trim()
  if (NEXT_TEXT.test(text)) score += 70
  if (NEXT_PHRASE.test(text)) score += 60
  const cls = el.className.toString().toLowerCase()
  if (cls.includes('next')) score += 40
  if (cls.includes('pagination')) score += 10
  if (el.tagName === 'A' || el.tagName === 'BUTTON') score += 5
  return score
}

export function findPaginationCandidates(root: ParentNode = document): PaginationCandidate[] {
  const out: PaginationCandidate[] = []
  const links = root.querySelectorAll('a[href], button, [role="button"]')
  links.forEach((el) => {
    const score = scoreLink(el)
    if (score < 5) return
    try {
      const selector = uniqueSelectorFor(el)
      out.push({ selector, score, element: el })
    } catch {
      /* */
    }
  })
  return out.sort((a, b) => b.score - a.score)
}

function uniqueSelectorFor(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  const rel = el.getAttribute('rel')
  if (rel?.includes('next')) return 'a[rel*="next" i]'
  const path: string[] = []
  let cur: Element | null = el
  for (let depth = 0; cur && depth < 4; depth++) {
    const tag = cur.tagName.toLowerCase()
    const parent: Element | null = cur.parentElement
    if (!parent) break
    const siblings = [...parent.children].filter((c) => c.tagName === cur!.tagName)
    const idx = siblings.indexOf(cur) + 1
    path.unshift(`${tag}:nth-of-type(${idx})`)
    cur = parent
  }
  return path.join(' > ')
}

export function bestNextSelector(root: ParentNode = document): string | undefined {
  return findPaginationCandidates(root)[0]?.selector
}
