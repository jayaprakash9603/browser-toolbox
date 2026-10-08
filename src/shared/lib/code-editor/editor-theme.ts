import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

export const editorShellClass =
  'overflow-hidden rounded-lg border border-input bg-background shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30'

export function isEditorDarkMode() {
  return document.documentElement.classList.contains('dark')
}

export function editorThemeClassAttribute() {
  return EditorView.editorAttributes.of({
    class: isEditorDarkMode() ? 'cm-theme-dark' : '',
  })
}

const sharedEditorRules = {
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
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--editor-active-line)',
    color: 'var(--foreground)',
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--editor-selection) !important' },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--editor-selection)',
    outline: '1px solid color-mix(in oklch, var(--primary) 45%, transparent)',
  },
  '.cm-selectionMatch': { backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)' },
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
}

export const editorTheme = EditorView.theme(sharedEditorRules)

export const editorDarkTheme = EditorView.theme(
  {
    '.cm-searchMatch': { backgroundColor: 'rgb(251 191 36 / 0.35)', borderRadius: '2px' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgb(251 191 36 / 0.55)' },
    '.cm-selectionMatch': { backgroundColor: 'color-mix(in oklch, var(--primary) 22%, transparent)' },
  },
  { dark: true },
)

const lightSyntax = HighlightStyle.define([
  { tag: [tags.propertyName, tags.labelName, tags.definition(tags.propertyName)], color: '#0b6e4f' },
  { tag: [tags.string, tags.special(tags.string)], color: '#b4371f' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#1d5fbf' },
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: '#7c3aed', fontWeight: '600' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#6b7280', fontStyle: 'italic' },
  { tag: [tags.tagName, tags.typeName, tags.className], color: '#a3360f' },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: '#525252' },
  { tag: tags.invalid, color: '#dc2626' },
])

const darkSyntax = HighlightStyle.define([
  { tag: [tags.propertyName, tags.labelName, tags.definition(tags.propertyName)], color: '#7ee787' },
  { tag: [tags.string, tags.special(tags.string)], color: '#ffb4a2' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#9ec5fe' },
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: '#d2a8ff', fontWeight: '600' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#9ca3af', fontStyle: 'italic' },
  { tag: [tags.tagName, tags.typeName, tags.className], color: '#ff9f8a' },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: '#c4c9d4' },
  { tag: tags.invalid, color: '#f87171' },
])

export function editorSyntaxForTheme(dark = isEditorDarkMode()) {
  return syntaxHighlighting(dark ? darkSyntax : lightSyntax)
}
