import { cn } from '@/shared/utils/cn'
import { Textarea } from '@/shared/components/ui/textarea'

interface TextEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  minRows?: number
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
      style={{ minHeight: `${minRows * 1.5}rem` }}
      onKeyDown={(event) => {
        if (onKeyCommand && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          onKeyCommand('submit')
        }
      }}
      className={cn('resize-y leading-relaxed', mono && 'font-mono', className)}
    />
  )
}
