import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import { Segmented } from '@/shared/components/ui/segmented'
import { Textarea } from '@/shared/components/ui/textarea'

import { dedupeTabs, hostOf, parseWorkspaceTags, type WorkspaceTab } from './model'

export type CaptureScope = 'window' | 'all'

export interface SaveRequest {
  key: string
  mode: 'create' | 'edit'
  workspaceId?: string
  name: string
  note: string
  tags: string[]
  tabs: WorkspaceTab[]
}

export interface SaveResult {
  name: string
  note: string
  tags: string[]
  tabs: WorkspaceTab[]
}

interface WorkspaceSaveDialogProps {
  request: SaveRequest | null
  scope: CaptureScope
  scopeLoading: boolean
  onScopeChange: (scope: CaptureScope) => void
  onClose: () => void
  onConfirm: (result: SaveResult, request: SaveRequest) => void
}

export function WorkspaceSaveDialog({
  request,
  scope,
  scopeLoading,
  onScopeChange,
  onClose,
  onConfirm,
}: WorkspaceSaveDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(92vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {request?.mode === 'edit'
              ? t('workspaces.editDialogTitle')
              : t('workspaces.saveDialogTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('workspaces.saveDialogTitle')}
          </DialogDescription>
        </DialogHeader>
        {request && (
          <SaveForm
            key={request.key}
            request={request}
            scope={scope}
            scopeLoading={scopeLoading}
            onScopeChange={onScopeChange}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SaveForm({
  request,
  scope,
  scopeLoading,
  onScopeChange,
  onClose,
  onConfirm,
}: Omit<WorkspaceSaveDialogProps, 'request'> & { request: SaveRequest }) {
  const { t } = useTranslation()
  const [name, setName] = useState(request.name)
  const [note, setNote] = useState(request.note)
  const [tagsText, setTagsText] = useState(request.tags.join(', '))
  const [dedupe, setDedupe] = useState(true)
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set())
  const isCreate = request.mode === 'create'

  const selected = useMemo(() => {
    const picked = request.tabs.filter((_, index) => !unchecked.has(index))
    return dedupe && isCreate ? dedupeTabs(picked) : picked
  }, [request.tabs, unchecked, dedupe, isCreate])

  const toggle = (index: number) =>
    setUnchecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <>
      <div className="grid gap-3">
        {isCreate && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('workspaces.scopeLabel')}
            </span>
            <Segmented
              size="sm"
              ariaLabel={t('workspaces.scopeLabel')}
              value={scope}
              onValueChange={onScopeChange}
              options={[
                { value: 'window', label: t('workspaces.scopeWindow'), disabled: scopeLoading },
                { value: 'all', label: t('workspaces.scopeAll'), disabled: scopeLoading },
              ]}
            />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="workspace-name">{t('workspaces.fieldName')}</Label>
          <Input id="workspace-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="workspace-tags">{t('workspaces.fieldTags')}</Label>
          <Input
            id="workspace-tags"
            value={tagsText}
            placeholder={t('workspaces.fieldTagsPlaceholder')}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="workspace-note">{t('workspaces.fieldNote')}</Label>
          <Textarea
            id="workspace-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-16 text-xs"
          />
        </div>

        {isCreate && (
          <fieldset className="grid gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-xs font-medium">
                {t('workspaces.selectTabs', {
                  selected: request.tabs.length - unchecked.size,
                  total: request.tabs.length,
                })}
              </legend>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setUnchecked(new Set())}
                >
                  {t('workspaces.selectAll')}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setUnchecked(new Set(request.tabs.map((_, index) => index)))}
                >
                  {t('workspaces.selectNone')}
                </Button>
              </div>
            </div>
            <ul className="scrollbar-styled max-h-40 space-y-0.5 overflow-y-auto rounded-lg border bg-muted/30 p-1">
              {request.tabs.map((tab, index) => (
                <li key={`${tab.url}-${index}`}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[11px] hover:bg-background/70">
                    <input
                      type="checkbox"
                      className="size-3.5 shrink-0 cursor-pointer accent-[var(--primary)]"
                      checked={!unchecked.has(index)}
                      onChange={() => toggle(index)}
                    />
                    <span className="min-w-0 flex-1 truncate">{tab.title || tab.url}</span>
                    <span className="hidden shrink-0 font-mono text-[9px] text-muted-foreground sm:inline">
                      {hostOf(tab.url)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 cursor-pointer accent-[var(--primary)]"
                checked={dedupe}
                onChange={(e) => setDedupe(e.target.checked)}
              />
              {t('workspaces.dedupeToggle')}
            </label>
            <p className="text-xs text-muted-foreground">
              {t('workspaces.saveDialogHint', { count: selected.length })}
            </p>
          </fieldset>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          size="sm"
          disabled={isCreate && !selected.length}
          onClick={() =>
            onConfirm(
              {
                name,
                note,
                tags: parseWorkspaceTags(tagsText),
                tabs: isCreate ? selected : request.tabs,
              },
              request,
            )
          }
        >
          {t('workspaces.confirmSave')}
        </Button>
      </DialogFooter>
    </>
  )
}
