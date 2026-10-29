import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyIcon, SparklesIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'

import {
  BUILTIN_SNIPPET_TOKENS,
  DEFAULT_SNIPPET_CATEGORIES,
  extractCustomVariables,
  parseSnippetTags,
  resolveSnippetBody,
  snippetStats,
  type Snippet,
  type SnippetResolveContext,
} from './model'

const QUICK_TOKENS = [...BUILTIN_SNIPPET_TOKENS, 'name', 'company'] as const

interface SnippetEditorDialogProps {
  editor: Snippet | null
  isEditing: boolean
  onChange: (next: Snippet | null) => void
  onSave: (tagsInput: string) => void
}

export function SnippetEditorDialog({
  editor,
  isEditing,
  onChange,
  onSave,
}: SnippetEditorDialogProps) {
  const { t } = useTranslation()
  const [tagsText, setTagsText] = useState('')
  const [trackedId, setTrackedId] = useState<string | null>(null)

  if (editor && editor.id !== trackedId) {
    setTrackedId(editor.id)
    setTagsText(editor.tags.join(', '))
  } else if (!editor && trackedId !== null) {
    setTrackedId(null)
  }

  const insertToken = (token: string) => {
    if (!editor) return
    const addition = `{{${token}}}`
    onChange({
      ...editor,
      body: editor.body
        ? `${editor.body}${editor.body.endsWith(' ') ? '' : ' '}${addition}`
        : addition,
    })
  }

  const stats = editor ? snippetStats(editor.body) : { words: 0, chars: 0, lines: 0 }

  return (
    <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && onChange(null)}>
      <DialogContent className="max-h-[min(92vh,38rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('snippets.editTitle') : t('snippets.newTitle')}</DialogTitle>
          <DialogDescription className="text-xs">{t('snippets.fieldBodyHint')}</DialogDescription>
        </DialogHeader>
        {editor && (
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="snippet-title">{t('snippets.fieldTitle')}</Label>
                <Input
                  id="snippet-title"
                  value={editor.title}
                  onChange={(e) => onChange({ ...editor, title: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="snippet-shortcut">{t('snippets.fieldShortcut')}</Label>
                <Input
                  id="snippet-shortcut"
                  placeholder={t('snippets.fieldShortcutPlaceholder')}
                  value={editor.shortcut ?? ''}
                  onChange={(e) => onChange({ ...editor, shortcut: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="snippet-category">{t('snippets.fieldCategory')}</Label>
                <Input
                  id="snippet-category"
                  list="snippet-category-suggestions"
                  value={editor.category}
                  onChange={(e) => onChange({ ...editor, category: e.target.value })}
                />
                <datalist id="snippet-category-suggestions">
                  {DEFAULT_SNIPPET_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="snippet-tags">{t('snippets.fieldTags')}</Label>
                <Input
                  id="snippet-tags"
                  placeholder={t('snippets.fieldTagsPlaceholder')}
                  value={tagsText}
                  onChange={(e) => {
                    setTagsText(e.target.value)
                    onChange({ ...editor, tags: parseSnippetTags(e.target.value) })
                  }}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="snippet-body">{t('snippets.fieldBody')}</Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {t('snippets.stats', stats)}
                </span>
              </div>
              <Textarea
                id="snippet-body"
                value={editor.body}
                onChange={(e) => onChange({ ...editor, body: e.target.value })}
                className="min-h-36 font-mono text-xs leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="mr-1 text-[10px] font-medium text-muted-foreground">
                  {t('snippets.insertToken')}
                </span>
                {QUICK_TOKENS.map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => insertToken(tok)}
                    className="cursor-pointer rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    {`{{${tok}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onChange(null)}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={() => onSave(tagsText)} disabled={!editor?.body.trim()}>
            {t('snippets.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface VariableFillDialogProps {
  snippet: Snippet | null
  context: SnippetResolveContext
  onClose: () => void
  onCopyResolved: (resolved: string, snippet: Snippet) => void
  onCopyRaw: (snippet: Snippet) => void
}

export function VariableFillDialog({
  snippet,
  context,
  onClose,
  onCopyResolved,
  onCopyRaw,
}: VariableFillDialogProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<Record<string, string>>({})
  const [trackedId, setTrackedId] = useState<string | null>(null)

  if (snippet && snippet.id !== trackedId) {
    setTrackedId(snippet.id)
    setValues({})
  } else if (!snippet && trackedId !== null) {
    setTrackedId(null)
  }

  const variables = useMemo(() => (snippet ? extractCustomVariables(snippet.body) : []), [snippet])
  const preview = useMemo(
    () => (snippet ? resolveSnippetBody(snippet.body, values, context) : ''),
    [snippet, values, context],
  )

  return (
    <Dialog open={Boolean(snippet)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(90vh,36rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <SparklesIcon className="size-4 text-primary" aria-hidden />
            {t('snippets.fillDialogTitle')}
          </DialogTitle>
          {snippet && (
            <DialogDescription className="text-xs">
              {t('snippets.fillDialogHint', { title: snippet.title })}
            </DialogDescription>
          )}
        </DialogHeader>
        {snippet && (
          <div className="grid gap-3">
            <div className="grid gap-2">
              {variables.map((variable, index) => (
                <div key={variable} className="grid gap-1">
                  <Label htmlFor={`snippet-var-${variable}`} className="font-mono text-xs">
                    {`{{${variable}}}`}
                  </Label>
                  <Input
                    id={`snippet-var-${variable}`}
                    autoFocus={index === 0}
                    placeholder={variable}
                    value={values[variable] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [variable]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t('snippets.fillPreview')}
              </span>
              <pre className="scrollbar-styled max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/45 p-2.5 font-mono text-xs leading-relaxed text-foreground">
                {preview}
              </pre>
            </div>
          </div>
        )}
        <DialogFooter className="gap-1.5 sm:justify-between">
          {snippet && (
            <Button variant="ghost" size="sm" onClick={() => onCopyRaw(snippet)}>
              {t('snippets.copyRaw')}
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {snippet && (
              <Button size="sm" onClick={() => onCopyResolved(preview, snippet)}>
                <CopyIcon className="size-3.5" />
                {t('snippets.copyResolved')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
