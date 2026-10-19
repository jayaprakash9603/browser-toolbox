/** Legacy hash paths that map to a single consolidated tool id. */
export const LEGACY_TOOL_ROUTES: Record<string, string> = {
  '/tools/clipboard/history': 'clipboard.manager',
  '/tools/clipboard/pinned': 'clipboard.manager',
  '/tools/clipboard/search': 'clipboard.manager',
  '/tools/text/markdown-formatter': 'text.formatter',
  '/tools/text/html-formatter': 'text.formatter',
  '/tools/text/css-formatter': 'text.formatter',
  '/tools/text/javascript-formatter': 'text.formatter',
  '/tools/text/word-counter': 'text.analyzer',
  '/tools/text/line-counter': 'text.analyzer',
  '/tools/text/duplicate-line-remover': 'text.line-tools',
  '/tools/text/sort-lines': 'text.line-tools',
  '/tools/text/lorem-ipsum': 'text.dummy-data',
  '/tools/qa/api-request-builder': 'api.request-builder',
  '/tools/developer/timestamp-toolkit': 'datetime.toolkit',
}
