import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
} from '@codemirror/view'

import {
  editorDarkTheme,
  editorSyntaxHighlighting,
  editorTheme,
  editorThemeClassAttribute,
} from '@/shared/lib/code-editor/editor-theme'
import { loadLanguage, type EditorLanguage } from '@/shared/lib/code-editor/languages'
import { cn } from '@/shared/utils/cn'

export interface CursorPosition {
  line: number
  column: number
}

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: EditorLanguage
  readOnly?: boolean
  wrap?: boolean
  placeholder?: string
  ariaLabel?: string
  onSubmit?: () => void
  onCursorChange?: (position: CursorPosition) => void
  className?: string
  style?: CSSProperties
}

function readCursor(state: EditorState): CursorPosition {
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  return { line: line.number, column: head - line.from + 1 }
}

export function CodeEditor({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  wrap = false,
  placeholder,
  ariaLabel,
  onSubmit,
  onCursorChange,
  className,
  style,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const compartments = useRef({
    language: new Compartment(),
    readOnly: new Compartment(),
    wrap: new Compartment(),
    placeholder: new Compartment(),
    aria: new Compartment(),
    themeClass: new Compartment(),
  })
  const callbacks = useRef({ onChange, onSubmit, onCursorChange })
  useLayoutEffect(() => {
    callbacks.current = { onChange, onSubmit, onCursorChange }
  })
  const initial = useRef({ value, readOnly, wrap, placeholder, ariaLabel })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const c = compartments.current
    const start = initial.current

    const extensions: Extension[] = [
      lineNumbers(),
      foldGutter({ openText: '▾', closedText: '▸' }),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      indentOnInput(),
      bracketMatching(),
      highlightSelectionMatches(),
      search({ top: true }),
      editorTheme,
      editorDarkTheme,
      ...editorSyntaxHighlighting,
      c.themeClass.of(editorThemeClassAttribute()),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            if (!callbacks.current.onSubmit) return false
            callbacks.current.onSubmit()
            return true
          },
        },
        ...searchKeymap,
        ...foldKeymap,
        ...historyKeymap,
        ...defaultKeymap,
      ]),
      c.language.of([]),
      c.readOnly.of(EditorState.readOnly.of(start.readOnly)),
      c.wrap.of(start.wrap ? EditorView.lineWrapping : []),
      c.placeholder.of(start.placeholder ? placeholderExtension(start.placeholder) : []),
      c.aria.of(
        EditorView.contentAttributes.of({
          'aria-label': start.ariaLabel ?? '',
          'aria-multiline': 'true',
          'aria-readonly': String(start.readOnly),
        }),
      ),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) callbacks.current.onChange?.(update.state.doc.toString())
        if (update.docChanged || update.selectionSet) {
          callbacks.current.onCursorChange?.(readCursor(update.state))
        }
      }),
    ]

    const view = new EditorView({
      state: EditorState.create({ doc: start.value, extensions }),
      parent: host,
    })
    viewRef.current = view
    callbacks.current.onCursorChange?.(readCursor(view.state))
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
  }, [value])

  useEffect(() => {
    let cancelled = false
    void loadLanguage(language).then((extension) => {
      if (cancelled || !viewRef.current) return
      viewRef.current.dispatch({ effects: compartments.current.language.reconfigure(extension) })
    })
    return () => {
      cancelled = true
    }
  }, [language])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const c = compartments.current
    view.dispatch({
      effects: [
        c.readOnly.reconfigure(EditorState.readOnly.of(readOnly)),
        c.wrap.reconfigure(wrap ? EditorView.lineWrapping : []),
        c.placeholder.reconfigure(placeholder ? placeholderExtension(placeholder) : []),
        c.aria.reconfigure(
          EditorView.contentAttributes.of({
            'aria-label': ariaLabel ?? '',
            'aria-multiline': 'true',
            'aria-readonly': String(readOnly),
          }),
        ),
      ],
    })
  }, [readOnly, wrap, placeholder, ariaLabel])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const syncTheme = () => {
      view.dispatch({ effects: compartments.current.themeClass.reconfigure(editorThemeClassAttribute()) })
    }
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={hostRef}
      style={style}
      className={cn(
        'min-h-0 min-w-0 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:scrollbar-both',
        className,
      )}
    />
  )
}
