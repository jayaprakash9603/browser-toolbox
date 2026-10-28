import { DESCRIPTION_WORDS, LABEL_WORDS, MAX_CAPTION_SOURCE, MAX_LABEL_DEPTH, MAX_SIBLING_STEPS, NOT_LABEL } from './constants'
import { fieldsWithin, isField } from './detect'
import { hidden, isCheckable, isControl } from './dom'
import { firstNode, nodesOf, radiosOf } from './entry'
import { cleanLabel, clip, humanize, quote, shortText, stableId, wordCount } from './text'
import type { Entry } from './types'

interface NearbyLabel {
  text: string
  depth: number
}

/** A caption this wordy reads like an instruction, so a short caption further back names the field better. */
const WORDY_CAPTION = 6
const SHORT_CAPTION = 4
const LABEL_NOISE = 'input, select, textarea, option, button, script, style, template'

/** Text kept for screen readers only: clipped to a pixel and taken out of the layout. */
function screenReaderOnly(style: CSSStyleDeclaration): boolean {
  if (style.position !== 'absolute' && style.position !== 'fixed') return false
  return (
    parseFloat(style.width) <= 1 ||
    parseFloat(style.height) <= 1 ||
    /rect\(\s*0/.test(style.clip) ||
    style.clipPath.startsWith('inset(50%')
  )
}

function unseen(el: Element): boolean {
  if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return true
  const style = getComputedStyle(el)
  return style.display === 'none' || style.visibility === 'hidden' || screenReaderOnly(style)
}

/** The text a sighted user reads in `root`, without nested controls or screen-reader-only hints. */
function visibleText(root: Element): string {
  let text = ''
  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? ''
    else if (node instanceof Element && !node.matches(LABEL_NOISE) && !unseen(node)) text += visibleText(node)
  }
  return text
}

function labelText(label: Element | null): string {
  if (!label) return ''
  return cleanLabel(clip(visibleText(label)))
}

function hintWords(el: Element): string[] {
  return `${el.getAttribute('class') ?? ''} ${el.id}`
    .split(/[\s_-]+|(?<=\p{Ll})(?=\p{Lu})/u)
    .map((word) => word.toLowerCase())
}

/** Help text for the field rather than its name: referenced by `aria-describedby`, or styled as a hint. */
function describes(node: Node, own: Element[]): boolean {
  if (!(node instanceof Element)) return false
  const described = own.flatMap((el) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/)).filter(Boolean)
  const only = node.childElementCount === 1 ? node.firstElementChild : null
  return [node, only].some((el) => {
    if (!el) return false
    if (el.id && described.includes(el.id)) return true
    const words = hintWords(el)
    return words.some((word) => DESCRIPTION_WORDS.has(word)) && !words.some((word) => LABEL_WORDS.has(word))
  })
}

const isHeading = (node: Node) => node instanceof Element && node.matches('h1, h2, h3, h4, h5, h6, legend, [role=heading]')

export function labelsOf(el: Element): Element[] {
  if (isControl(el) && el.labels) return [...el.labels]
  return el.id ? [...document.querySelectorAll(`label[for="${quote(el.id)}"]`)] : []
}

/** What a node beside a field says, when it reads like a caption rather than another control. */
function captionOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return shortText(node.textContent ?? '')
  if (!(node instanceof Element) || node.matches(NOT_LABEL) || hidden(node)) return ''
  if (isField(node) || fieldsWithin(node, [])) return ''
  if ((node.textContent ?? '').length > MAX_CAPTION_SOURCE) return ''
  return shortText(visibleText(node)) || shortText(node.getAttribute('title') ?? '')
}

/**
 * The nearest caption beside `start`; `null` when another field sits in between. Looking back,
 * help text between a caption and its field ("Enter the path…" under "glue_code") is passed over.
 */
function siblingCaption(start: Node, forward: boolean, onlyLabels: boolean, skip: Set<string>, own: Element[]): string | null {
  let steps = 0
  // Help text seen so far; `strict` when it is only wordy, so just a short non-heading caption may replace it.
  let fallback: { text: string; strict: boolean } | null = null
  for (
    let node = forward ? start.nextSibling : start.previousSibling;
    node && steps < MAX_SIBLING_STEPS;
    node = forward ? node.nextSibling : node.previousSibling
  ) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue
    if (node instanceof Element && ((!own.includes(node) && isField(node)) || fieldsWithin(node, own))) {
      return fallback?.text ?? null
    }
    steps += 1
    if (onlyLabels && !(node instanceof HTMLLabelElement)) continue
    const text = captionOf(node)
    if (!text || skip.has(text)) continue
    if (forward) return text
    const described = describes(node, own)
    if (!fallback) {
      if (!described && wordCount(text) < WORDY_CAPTION) return text
      fallback = { text, strict: !described }
      continue
    }
    if (described) continue
    if (!fallback.strict || (wordCount(text) <= SHORT_CAPTION && !isHeading(node))) return text
    return fallback.text
  }
  return fallback?.text ?? ''
}

/**
 * Walks outward from the field: a caption before it at each level (a sibling div, a table cell,
 * a heading text node), stopping once a level also holds another field, since anything beyond
 * that belongs to the group rather than this field.
 */
function nearbyLabel(own: Element[], start: Element, captionAfter: boolean, skip = new Set<string>()): NearbyLabel | null {
  let node = start
  for (let depth = 0; depth < MAX_LABEL_DEPTH; depth += 1) {
    // A checkbox caption follows it; looking back first would pick up the previous box's caption.
    const after = captionAfter ? siblingCaption(node, true, false, skip, own) : ''
    if (after) return { text: after, depth }
    const before = siblingCaption(node, false, false, skip, own)
    if (before) return { text: before, depth }
    const label = captionAfter ? '' : siblingCaption(node, true, true, skip, own)
    if (label) return { text: label, depth }
    const parent = node.parentElement
    if (before === null || !parent || parent === document.body || fieldsWithin(parent, own)) return null
    node = parent
  }
  return null
}

function columnLabel(el: Element): string {
  const cell = el.closest('td')
  const table = cell?.closest('table')
  if (!cell || !table) return ''
  const header = table.tHead?.rows[0] ?? (table.rows[0] !== cell.parentElement ? table.rows[0] : undefined)
  const th = header?.cells[cell.cellIndex]
  return th ? captionOf(th) : ''
}

export function ariaLabel(el: Element): string {
  const aria = el.getAttribute('aria-label')
  if (aria?.trim()) return cleanLabel(clip(aria))
  const by = el.getAttribute('aria-labelledby')
  if (!by) return ''
  return cleanLabel(clip(by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')))
}

export function placeholderOf(el: Element): string {
  return clip(el.getAttribute('placeholder') ?? el.getAttribute('aria-placeholder') ?? el.getAttribute('data-placeholder') ?? '')
}

export function ownLabel(el: Element): string {
  const aria = ariaLabel(el)
  if (aria) return aria
  for (const label of labelsOf(el)) {
    const text = labelText(label)
    if (text) return text
  }
  const near = nearbyLabel([el], el, isCheckable(el))
  const placeholder = placeholderOf(el)
  // A caption several levels up may be a section title; a placeholder names the field itself.
  if (near && (near.depth < 2 || !placeholder)) return near.text
  if (placeholder) return placeholder
  return columnLabel(el) || clip(el.getAttribute('title') ?? '')
}

export function groupLabel(el: Element): string {
  const group = el.closest('fieldset, [role=radiogroup], [role=group]')
  if (!group) return ''
  return labelText(group.querySelector('legend')) || ariaLabel(group)
}

/** The caption of one radio or option, as opposed to the question the group asks. */
export function optionLabel(el: Element): string {
  for (const label of labelsOf(el)) {
    const text = labelText(label)
    if (text) return text
  }
  if (!(el instanceof HTMLInputElement)) return ariaLabel(el) || clip(el.textContent ?? '')
  return ariaLabel(el) || siblingCaption(el, true, false, new Set(), [el]) || el.value
}

export function radioValue(el: Element): string {
  if (el instanceof HTMLInputElement) return el.value
  return el.getAttribute('data-value') ?? el.getAttribute('value') ?? optionLabel(el)
}

export function radioLabel(entry: Entry): string {
  const first = firstNode(entry)
  const group = entry.widget ? ariaLabel(first) : groupLabel(first)
  if (group) return group
  // Option captions sit next to each radio, so they must not be mistaken for the question.
  const options = new Set(radiosOf(entry).map(optionLabel))
  return nearbyLabel(nodesOf(entry), first, false, options)?.text || humanize(first.getAttribute('name') ?? '') || 'Choice'
}

export function fieldLabel(entry: Entry): string {
  if (entry.kind === 'radio') return radioLabel(entry)
  const el = firstNode(entry)
  const name = el.getAttribute('name') ?? ''
  return ownLabel(el) || humanize(name) || humanize(stableId(el.id)) || name || entry.kind
}
