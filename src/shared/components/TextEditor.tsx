import { cn } from '@/shared/utils/cn'
import { Textarea } from '@/shared/components/ui/textarea'

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
}: TextEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-label={ariaLabel}
      style={fill ? undefined : { height: `${minRows * 1.5 + 1.25}rem` }}
      onKeyDown={(event) => {
        if (onKeyCommand && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          onKeyCommand('submit')
        }
      }}
      className={cn('resize-none overflow-y-auto leading-relaxed', fill && 'min-h-0 flex-1', mono && 'font-mono', className)}
    />
  )
}
