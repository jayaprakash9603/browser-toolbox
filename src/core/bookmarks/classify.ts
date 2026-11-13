import type { BookmarkRow } from '@/tools/productivity/bookmarks/service'

import { hostnameOf } from './urls'

import type { BookmarkWorkspace } from './model'

const DOMAIN_HINTS: Record<string, string> = {
  github: 'development',
  gitlab: 'development',
  stackoverflow: 'development',
  npmjs: 'development',
  figma: 'design',
  dribbble: 'design',
  behance: 'design',
  awwwards: 'design',
  linkedin: 'seo-marketing',
  hubspot: 'seo-marketing',
  ahrefs: 'seo-marketing',
  notion: 'productivity',
  todoist: 'productivity',
  trello: 'productivity',
  coursera: 'learning',
  udemy: 'learning',
  wikipedia: 'research',
  arxiv: 'research',
  mdn: 'documentation',
  twitter: 'social',
  'x.com': 'social',
  instagram: 'social',
  facebook: 'social',
  reddit: 'social',
  nytimes: 'news',
  bbc: 'news',
  amazon: 'shopping',
  ebay: 'shopping',
  youtube: 'entertainment',
  netflix: 'entertainment',
  stripe: 'finance',
  paypal: 'finance',
}

const KEYWORD_HINTS: [RegExp, string][] = [
  [/\b(react|typescript|api|github|css|html|node)\b/i, 'development'],
  [/\b(figma|palette|typography|wireframe|ui|ux)\b/i, 'design'],
  [/\b(seo|marketing|campaign|analytics)\b/i, 'seo-marketing'],
  [/\b(todo|notion|kanban|gtd)\b/i, 'productivity'],
  [/\b(course|tutorial|learn|lesson)\b/i, 'learning'],
  [/\b(paper|study|research|arxiv)\b/i, 'research'],
  [/\b(docs|documentation|reference)\b/i, 'documentation'],
  [/\b(shop|buy|cart|price)\b/i, 'shopping'],
  [/\b(news|headline|breaking)\b/i, 'news'],
  [/\b(bank|invoice|tax|stock)\b/i, 'finance'],
]

export function suggestCollectionId(row: BookmarkRow, workspace: BookmarkWorkspace): string {
  const domain = hostnameOf(row.url)
  for (const [needle, id] of Object.entries(DOMAIN_HINTS)) {
    if (domain.includes(needle) && workspace.collections[id]) return id
  }
  const text = `${row.title} ${row.folderPath} ${row.url}`
  for (const [pattern, id] of KEYWORD_HINTS) {
    if (pattern.test(text) && workspace.collections[id]) return id
  }
  return workspace.collections.other ? 'other' : Object.keys(workspace.collections)[0] ?? 'other'
}

export function suggestTagNames(row: BookmarkRow): string[] {
  const domain = hostnameOf(row.url).split('.')[0]
  const words = row.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 2)
  return [...new Set([domain, ...words].filter(Boolean))]
}
