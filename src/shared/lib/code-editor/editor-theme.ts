import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

export const editorShellClass =
  'overflow-hidden rounded-lg border border-input bg-background shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30'

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
    scrollbarGutter: 'stable',
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: 'var(--primary)',
  },
  '.cm-line': { padding: '0 12px 0 8px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--primary)', borderLeftWidth: '2px' },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-gutter)',
    borderRight: '1px solid var(--border)',
    color: 'var(--muted-foreground)',
    fontSize: '11.5px',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px', minWidth: '28px' },
  '.cm-activeLine': { backgroundColor: 'var(--editor-active-line)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--editor-active-line)', color: 'var(--foreground)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--editor-selection) !important' },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--editor-selection)',
    outline: '1px solid color-mix(in oklch, var(--primary) 45%, transparent)',
  },
  '.cm-selectionMatch': { backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)' },
  '.cm-searchMatch': { backgroundColor: 'rgb(252 211 77 / 0.4)', borderRadius: '2px' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgb(251 191 36 / 0.75)' },
  '.cm-placeholder': { color: 'var(--muted-foreground)', fontStyle: 'normal' },
  '.cm-panels': {
    backgroundColor: 'var(--card)',
    color: 'var(--foreground)',
    fontFamily: 'inherit',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
  '.cm-panel.cm-search': { padding: '6px 8px', fontSize: '12px' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid var(--input)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    padding: '2px 6px',
  },
  '.cm-panel.cm-search button:hover': { backgroundColor: 'var(--accent)' },
  '.cm-panel.cm-search label': { fontSize: '12px' },
  '.cm-button': { backgroundImage: 'none' },
  '.cm-textfield:focus': { outline: '2px solid var(--ring)', outlineOffset: '-1px' },
})

const highlightStyle = HighlightStyle.define([
  { tag: [tags.propertyName, tags.attributeName, tags.definition(tags.propertyName)], color: 'var(--syntax-key)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--syntax-number)' },
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: 'var(--syntax-keyword)', fontWeight: '600' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.tagName, tags.typeName, tags.className], color: 'var(--syntax-tag)' },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: 'var(--muted-foreground)' },
  { tag: tags.invalid, color: 'var(--destructive)' },
])

export const editorHighlighting = syntaxHighlighting(highlightStyle)
