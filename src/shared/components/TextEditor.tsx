import type { ReactNode } from 'react'

import { EditorPane, type EditorStatus } from '@/shared/components/EditorPane'
import { Textarea } from '@/shared/components/ui/textarea'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'
import { cn } from '@/shared/utils/cn'

interface TextEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  minRows?: number
  fill?: boolean
  mono?: boolean
  ariaLabel?: string
  className?: string
  onKeyCommand?: (command: 'submit') => void
  label?: ReactNode
  language?: EditorLanguage
  actions?: ReactNode
  status?: EditorStatus | null
  wrap?: boolean
}

export function TextEditor({
  value,
  onChange,
  placeholder,
  readOnly,
  minRows = 6,
  fill = false,
  mono = true,
  ariaLabel,
  className,
  onKeyCommand,
  label,
  language,
  actions,
  status,
  wrap,
}: TextEditorProps) {
  if (!mono) {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-label={ariaLabel}
        style={fill ? undefined : { height: `${minRows * 1.6 + 1.25}rem` }}
        onKeyDown={(event) => {
          if (onKeyCommand && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            onKeyCommand('submit')
          }
        }}
        className={cn('resize-none', fill && 'min-h-0 flex-1', className)}
      />
    )
  }

  return (
    <EditorPane
      value={value}
      onChange={readOnly ? undefined : onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      minRows={minRows}
      fill={fill}
      label={label}
      language={language}
      actions={actions}
      status={status}
      wrap={wrap ?? language === undefined}
      onSubmit={onKeyCommand ? () => onKeyCommand('submit') : undefined}
      className={className}
    />
  )
}
