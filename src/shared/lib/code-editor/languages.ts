import type { Extension } from '@codemirror/state'

export type EditorLanguage = 'text' | 'json' | 'yaml' | 'xml' | 'html' | 'css' | 'javascript' | 'sql'

const loaders: Record<Exclude<EditorLanguage, 'text'>, () => Promise<Extension>> = {
  json: () => import('@codemirror/lang-json').then((m) => m.json()),
  yaml: () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  xml: () => import('@codemirror/lang-xml').then((m) => m.xml()),
  html: () => import('@codemirror/lang-html').then((m) => m.html()),
  css: () => import('@codemirror/lang-css').then((m) => m.css()),
  javascript: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true })),
  sql: () => import('@codemirror/lang-sql').then((m) => m.sql()),
}

const cache = new Map<EditorLanguage, Promise<Extension>>()

export function loadLanguage(language: EditorLanguage): Promise<Extension> {
  if (language === 'text') return Promise.resolve([])
  let pending = cache.get(language)
  if (!pending) {
    pending = loaders[language]().catch(() => {
      cache.delete(language)
      return []
    })
    cache.set(language, pending)
  }
  return pending
}

export const LANGUAGE_LABELS: Record<EditorLanguage, string> = {
  text: 'Text',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  html: 'HTML',
  css: 'CSS',
  javascript: 'JS/TS',
  sql: 'SQL',
}

export const LANGUAGE_EXTENSIONS: Record<EditorLanguage, string> = {
  text: 'txt',
  json: 'json',
  yaml: 'yaml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  javascript: 'ts',
  sql: 'sql',
}
