import { useState, type ReactNode } from 'react'
import {
  CheckCircle2Icon,
  ClipboardPasteIcon,
  DownloadIcon,
  EraserIcon,
  TriangleAlertIcon,
  WrapTextIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CodeEditor, type CursorPosition } from '@/shared/components/CodeEditor'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useTextStats } from '@/shared/hooks/useTextStats'
import { editorShellClass } from '@/shared/lib/code-editor/editor-theme'
import {
  LANGUAGE_EXTENSIONS,
  LANGUAGE_LABELS,
  type EditorLanguage,
} from '@/shared/lib/code-editor/languages'
import { cn } from '@/shared/utils/cn'

export interface EditorStatus {
  tone: 'valid' | 'invalid'
  text: string
}

export interface EditorPaneProps {
  value: string
  onChange?: (value: string) => void
  language?: EditorLanguage
  readOnly?: boolean
  placeholder?: string
  ariaLabel?: string
  label?: ReactNode
  actions?: ReactNode
  status?: EditorStatus | null
  fill?: boolean
  minRows?: number
  wrap?: boolean
  onSubmit?: () => void
  className?: string
}

export function IconAction({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          className={cn('text-muted-foreground', pressed && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function download(value: string, language: EditorLanguage) {
  const url = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `output.${LANGUAGE_EXTENSIONS[language]}`
  link.click()
  URL.revokeObjectURL(url)
}

export function EditorPane({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  placeholder,
  ariaLabel,
  label,
  actions,
  status,
  fill = false,
  minRows = 6,
  wrap: initialWrap = false,
  onSubmit,
  className,
}: EditorPaneProps) {
  const { t } = useTranslation()
  const [wrap, setWrap] = useState(initialWrap)
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, column: 1 })
  const stats = useTextStats(value)
  const editable = !readOnly && Boolean(onChange)
  const hasHeader = label !== undefined || actions !== undefined

  const paste = async () => {
    const text = await navigator.clipboard.readText().catch(() => '')
    if (text) onChange?.(text)
  }

  const builtIns = (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconAction label={t('editor.wrap')} pressed={wrap} onClick={() => setWrap((w) => !w)}>
        <WrapTextIcon />
      </IconAction>
      {editable && (
        <IconAction label={t('editor.paste')} onClick={() => void paste()}>
          <ClipboardPasteIcon />
        </IconAction>
      )}
      {hasHeader && (
        <IconAction label={t('editor.download')} disabled={!value} onClick={() => download(value, language)}>
          <DownloadIcon />
        </IconAction>
      )}
      <CopyButton text={value} size="icon-xs" />
      {editable && (
        <IconAction label={t('common.clear')} disabled={!value} onClick={() => onChange?.('')}>
          <EraserIcon />
        </IconAction>
      )}
    </div>
  )

  return (
    <section
      aria-label={typeof label === 'string' ? label : ariaLabel}
      className={cn(
        'flex min-h-0 min-w-0 flex-col',
        editorShellClass,
        readOnly && 'bg-muted/20',
        fill && 'h-full flex-1',
        className,
      )}
    >
      {hasHeader && (
        <header className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/40 py-1 pr-1.5 pl-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {label !== undefined && <span className="truncate text-xs font-semibold">{label}</span>}
            {language !== 'text' && (
              <span className="rounded border bg-background px-1.5 text-[11px] leading-4 font-medium text-muted-foreground">
                {LANGUAGE_LABELS[language]}
              </span>
            )}
            {readOnly && (
              <span className="text-[11px] text-muted-foreground">{t('editor.readOnly')}</span>
            )}
          </div>
          {actions}
          {builtIns}
        </header>
      )}
      <CodeEditor
        value={value}
        onChange={editable ? onChange : undefined}
        language={language}
        readOnly={!editable}
        wrap={wrap}
        placeholder={placeholder ?? (readOnly ? t('editor.empty') : undefined)}
        ariaLabel={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        onSubmit={onSubmit}
        onCursorChange={setCursor}
        className={fill ? 'flex-1' : undefined}
        style={fill ? undefined : { height: `${minRows * 1.3 + 1}rem` }}
      />
      <footer className="flex h-8 shrink-0 items-center gap-3 border-t bg-muted/40 pr-1.5 pl-3 text-[11px] text-muted-foreground tabular-nums">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden whitespace-nowrap" aria-live="polite">
          <span>{t('editor.position', { line: cursor.line, column: cursor.column })}</span>
          <span aria-hidden className="text-border">|</span>
          <span>{t('common.lines', { count: stats.lines })}</span>
          <span className="hidden @[560px]:inline">{t('common.words', { count: stats.words })}</span>
          <span className="truncate">{t('common.chars', { count: stats.chars })}</span>
        </div>
        {status && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 font-medium',
              status.tone === 'valid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
            )}
          >
            {status.tone === 'valid' ? (
              <CheckCircle2Icon className="size-3.5" aria-hidden />
            ) : (
              <TriangleAlertIcon className="size-3.5" aria-hidden />
            )}
            {status.text}
          </span>
        )}
        {!hasHeader && builtIns}
      </footer>
    </section>
  )
}
