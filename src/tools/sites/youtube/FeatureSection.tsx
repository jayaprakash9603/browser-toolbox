import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from 'lucide-react'

import {
  YOUTUBE_FEATURES,
  sectionLabelKey,
  type YoutubeEnhancerState,
  type YoutubeFeatureValue,
  type YoutubeSection,
} from '@/core/sites/youtube'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'

import { FeatureRow } from './FeatureRow'

function isActive(state: YoutubeEnhancerState, id: string, defaultVal: unknown): boolean {
  const v = state.values[id]
  if (typeof defaultVal === 'boolean') return v === true
  if (typeof defaultVal === 'number') return v !== defaultVal
  if (typeof defaultVal === 'string') return v !== defaultVal && String(v).length > 0
  return false
}

export function FeatureSection({
  section,
  state,
  query,
  onPatch,
  onResetSection,
}: {
  section: YoutubeSection
  state: YoutubeEnhancerState
  query: string
  onPatch: (values: Record<string, YoutubeFeatureValue>) => void
  onResetSection: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const features = useMemo(() => {
    const q = query.trim().toLowerCase()
    return YOUTUBE_FEATURES.filter((f) => {
      if (f.section !== section) return false
      if (!q) return true
      return (
        f.id.toLowerCase().includes(q) ||
        t(sectionLabelKey(section)).toLowerCase().includes(q) ||
        t(`sites.youtube.features.${f.id}.label`).toLowerCase().includes(q)
      )
    })
  }, [section, query, t])

  if (!features.length) return null

  const active = features.filter((f) => isActive(state, f.id, f.default)).length

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs font-semibold">{t(sectionLabelKey(section))}</span>
        <span className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">{active}/{features.length}</Badge>
          <ChevronDownIcon className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <>
          <ul className="flex flex-col divide-y border-t">
            {features.map((f) => (
              <FeatureRow key={f.id} feature={f} state={state} onPatch={onPatch} />
            ))}
          </ul>
          <div className="border-t px-3 py-2">
            <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={onResetSection}>
              Reset section
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
