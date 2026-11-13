import { lazy, Suspense, type CSSProperties } from 'react'

import { cn } from '@/shared/utils/cn'

export interface CursorPosition {
  line: number
  column: number
}

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: import('@/shared/lib/code-editor/languages').EditorLanguage
  readOnly?: boolean
  wrap?: boolean
  placeholder?: string
  ariaLabel?: string
  onSubmit?: () => void
  onCursorChange?: (position: CursorPosition) => void
  enableSearch?: boolean
  className?: string
  style?: CSSProperties
}

const CodeEditorImpl = lazy(() =>
  import('./CodeEditorImpl').then((module) => ({ default: module.CodeEditorImpl })),
)

/** CodeMirror mounts on first use so heavy editor tooling stays out of unrelated tool chunks. */
export function CodeEditor(props: CodeEditorProps) {
  return (
    <Suspense
      fallback={
        <div
          style={props.style}
          className={cn('min-h-0 min-w-0 overflow-hidden bg-muted/30', props.className)}
          aria-hidden
        />
      }
    >
      <CodeEditorImpl {...props} />
    </Suspense>
  )
}
