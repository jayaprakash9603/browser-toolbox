import * as Diff from 'diff'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  parseMetadata,
  pickLocalized,
  recordFromSource,
  upsertScriptRecord,
  getScriptCode,
  setScriptExternals,
  refreshScriptExternals,
} from '@/core/script-studio'
import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'

import { ScriptStudioLoadingSkeleton } from './ScriptStudioLoadingSkeleton'

type Props = {
  url: string
  onDone: (id: string) => void
  onCancel: () => void
}

export function InstallReview({ url, onDone, onCancel }: Props) {
  const { t } = useTranslation()
  const [remote, setRemote] = useState('')
  const [diffText, setDiffText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const res = await fetch(url)
      const text = await res.text()
      setRemote(text)
      setLoading(false)
    })()
  }, [url])

  const meta = parseMetadata(remote)

  useEffect(() => {
    if (!remote || !meta) return
    void (async () => {
      const { getScriptStudioIndex } = await import('@/core/script-studio')
      const index = await getScriptStudioIndex()
      const existing = index.scripts.find((s) => s.installUrl === url)
      if (!existing) return
      const local = (await getScriptCode(existing.id)) ?? ''
      setDiffText(Diff.createTwoFilesPatch('installed', 'remote', local, remote).slice(0, 4000))
    })()
  }, [remote, meta, url])

  const install = async () => {
    const id = crypto.randomUUID()
    const record = recordFromSource(id, remote, { installUrl: url })
    if (meta) {
      const ext = await refreshScriptExternals(meta, [], true)
      await setScriptExternals(id, ext)
    }
    await upsertScriptRecord(record, remote)
    await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
    onDone(id)
  }

  if (loading) return <ScriptStudioLoadingSkeleton variant="install" />
  if (!meta) return <p className="text-xs text-destructive">Invalid userscript</p>

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">{t('scriptStudio.install.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{pickLocalized(meta.name)}</CardTitle>
          <CardDescription>{pickLocalized(meta.description)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>Version {meta.version}</p>
          <p>Grants: {meta.grants.join(', ') || 'default'}</p>
          <p>Connect: {meta.connects.join(', ') || 'none'}</p>
        </CardContent>
      </Card>
      {diffText ? (
        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-[10px]">{diffText}</pre>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={() => void install()}>{t('scriptStudio.install.confirm')}</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
