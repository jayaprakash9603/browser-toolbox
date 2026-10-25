import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isBroadMatch } from '@/core/script-studio/match'
import type { ScriptRecord } from '@/core/script-studio'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Switch } from '@/shared/components/ui/switch'
import { Badge } from '@/shared/components/ui/badge'

type SortKey = 'name' | 'version' | 'updatedAt' | 'size'

type Props = {
  scripts: ScriptRecord[]
  trashed?: boolean
  onToggle: (record: ScriptRecord, enabled: boolean) => void
  onSelect: (id: string) => void
  onTrash: (ids: string[]) => void
  onRestore?: (id: string) => void
  onBulkEnable: (ids: string[], enabled: boolean) => void
  onCheckUpdates: (ids: string[]) => void
  loadCode: (id: string) => Promise<string | null>
}

function matchSearch(query: string, text: string): boolean {
  if (!query) return true
  try {
    return new RegExp(query, 'i').test(text)
  } catch {
    return text.toLowerCase().includes(query.toLowerCase())
  }
}

export function LibraryView({
  scripts,
  trashed = false,
  onToggle,
  onSelect,
  onTrash,
  onRestore,
  onBulkEnable,
  onCheckUpdates,
  loadCode,
}: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const s of scripts) for (const tag of s.overrides.tags ?? []) set.add(tag)
    return [...set]
  }, [scripts])

  const filtered = useMemo(() => {
    let list = scripts.filter((s) => (trashed ? s.trashed : !s.trashed))
    if (tagFilter) list = list.filter((s) => s.overrides.tags?.includes(tagFilter))
    list = list.filter((s) => matchSearch(query, `${s.name} ${s.version}`))
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'version') return a.version.localeCompare(b.version)
      if (sort === 'size') return b.size - a.size
      return b.updatedAt - a.updatedAt
    })
    return list
  }, [scripts, trashed, query, sort, tagFilter])

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id))

  const onDropFiles = (files: FileList | null) => {
    if (!files?.length) return
    void (async () => {
      for (const file of files) {
        if (!file.name.endsWith('.user.js')) continue
        const text = await file.text()
        const { createScriptId, recordFromSource, upsertScriptRecord } = await import('@/core/script-studio')
        const { sendMessage } = await import('@/core/messaging')
        const id = createScriptId()
        await upsertScriptRecord(recordFromSource(id, text), text)
        await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
      }
    })()
  }

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropFiles(e.dataTransfer.files)
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('scriptStudio.library.search')}
          className="min-w-[200px] flex-1"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger size="sm" className="w-[120px]" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="version">Version</SelectItem>
            <SelectItem value="updatedAt">Updated</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${tagFilter === tag ? 'bg-primary text-primary-foreground' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence>
        {selected.size > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="sticky bottom-2 z-10 flex flex-wrap gap-2 rounded-xl border bg-card p-2 shadow-md"
          >
            <Button size="sm" variant="secondary" onClick={() => onBulkEnable([...selected], true)}>
              {t('scriptStudio.library.bulk.enable')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onBulkEnable([...selected], false)}>
              {t('scriptStudio.library.bulk.disable')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCheckUpdates([...selected])}>
              {t('scriptStudio.library.bulk.update')}
            </Button>
            {!trashed ? (
              <Button size="sm" variant="destructive" onClick={() => onTrash([...selected])}>
                {t('scriptStudio.library.bulk.trash')}
              </Button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(c) => {
                    if (c) setSelected(new Set(filtered.map((s) => s.id)))
                    else setSelected(new Set())
                  }}
                  aria-label="Select all"
                />
              </th>
              <th className="p-2">On</th>
              <th className="p-2">Name</th>
              <th className="p-2">Version</th>
              <th className="p-2">Size</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b hover:bg-muted/40"
              >
                <td className="p-2">
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={(c) => {
                      const next = new Set(selected)
                      if (c) next.add(s.id)
                      else next.delete(s.id)
                      setSelected(next)
                    }}
                  />
                </td>
                <td className="p-2">
                  {!trashed ? <Switch checked={s.enabled} onCheckedChange={(on) => onToggle(s, on)} /> : null}
                </td>
                <td className="p-2">
                  <button type="button" className="font-medium hover:underline" onClick={() => onSelect(s.id)}>
                    {s.name}
                  </button>
                  <BroadBadge scriptId={s.id} loadCode={loadCode} />
                </td>
                <td className="p-2">{s.version}</td>
                <td className="p-2">{(s.size / 1024).toFixed(1)} KB</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <button type="button" className="text-sm font-medium" onClick={() => onSelect(s.id)}>
                {s.name}
              </button>
              {!trashed ? <Switch checked={s.enabled} onCheckedChange={(on) => onToggle(s, on)} /> : null}
            </div>
            {trashed && onRestore ? (
              <Button size="sm" className="mt-2" onClick={() => onRestore(s.id)}>
                Restore
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function BroadBadge({
  scriptId,
  loadCode,
}: {
  scriptId: string
  loadCode: (id: string) => Promise<string | null>
}) {
  const [broad, setBroad] = useState(false)
  useEffect(() => {
    void loadCode(scriptId).then((code) => {
      if (!code) return
      import('@/core/script-studio/metadata').then(({ parseMetadata }) => {
        const m = parseMetadata(code)
        if (m && isBroadMatch([...m.matches, ...m.includes])) setBroad(true)
      })
    })
  }, [scriptId, loadCode])
  if (!broad) return null
  return (
    <Badge variant="outline" className="ml-2 text-[10px] text-amber-600">
      broad match
    </Badge>
  )
}
