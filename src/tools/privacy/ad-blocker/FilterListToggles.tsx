import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AdblockState, RulesetId } from '@/core/adblock'
import { Switch } from '@/shared/components/ui/switch'

const VISIBLE_LISTS: { id: RulesetId; labelKey: string; descKey: string; license: string }[] = [
  { id: 'ads', labelKey: 'adblock.list.ads', descKey: 'adblock.list.adsDescription', license: 'GPLv3' },
  {
    id: 'privacy',
    labelKey: 'adblock.list.privacy',
    descKey: 'adblock.list.privacyDescription',
    license: 'GPLv3',
  },
  {
    id: 'annoyances',
    labelKey: 'adblock.list.annoyances',
    descKey: 'adblock.list.annoyancesDescription',
    license: 'CC BY 3.0',
  },
  {
    id: 'youtube',
    labelKey: 'adblock.list.youtube',
    descKey: 'adblock.list.youtubeDescription',
    license: 'Built-in',
  },
]

interface ListsMeta {
  rulesets?: Partial<Record<RulesetId, number>>
  generatedAt?: string
}

function useListsMeta(): ListsMeta | null {
  const [meta, setMeta] = useState<ListsMeta | null>(null)
  useEffect(() => {
    void fetch(chrome.runtime.getURL('adblock/meta.json'))
      .then((res) => res.json() as Promise<ListsMeta>)
      .then(setMeta)
      .catch(() => setMeta({}))
  }, [])
  return meta
}

function isListOn(state: AdblockState, id: RulesetId): boolean {
  if (id === 'annoyances') return state.cookieBanners
  if (id === 'youtube') return state.youtubeEnabled && state.lists.youtube
  return state.lists[id]
}

function patchFor(state: AdblockState, id: RulesetId, on: boolean): Partial<AdblockState> {
  if (id === 'annoyances') return { cookieBanners: on }
  if (id === 'youtube') return { youtubeEnabled: on, lists: { ...state.lists, youtube: on } }
  return { lists: { ...state.lists, [id]: on } }
}

export function FilterListToggles({
  state,
  disabled,
  onPatch,
}: {
  state: AdblockState
  disabled: boolean
  onPatch: (patch: Partial<AdblockState>) => void
}) {
  const { t } = useTranslation()
  const meta = useListsMeta()
  const updated = meta?.generatedAt ? new Date(meta.generatedAt).toLocaleDateString() : null

  return (
    <div className="flex flex-col gap-2">
      {VISIBLE_LISTS.map((list) => (
        <div key={list.id} className="flex items-start justify-between gap-3 rounded-md border p-2">
          <div className="min-w-0">
            <p className="text-xs font-medium">{t(list.labelKey)}</p>
            <p className="text-[11px] text-muted-foreground">{t(list.descKey)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t('adblock.listMeta', {
                count: meta?.rulesets?.[list.id] ?? 0,
                license: list.license,
              })}
            </p>
          </div>
          <Switch
            checked={isListOn(state, list.id)}
            disabled={disabled}
            onCheckedChange={(checked) => onPatch(patchFor(state, list.id, checked))}
            aria-label={t(list.labelKey)}
          />
        </div>
      ))}
      {updated && (
        <p className="text-[10px] text-muted-foreground">{t('adblock.listsUpdated', { date: updated })}</p>
      )}
    </div>
  )
}
