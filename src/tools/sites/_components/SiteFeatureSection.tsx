import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from 'lucide-react'

import { useRouter } from '@/app/router'
import { parseSearchParam } from '@/shared/hooks/useDeepLinkTab'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'

import { SiteFeatureRow, type SiteFeatureDef } from './SiteFeatureRow'

function isActive(value: unknown, defaultVal: unknown): boolean {
  if (typeof defaultVal === 'boolean') return value === true
  if (typeof defaultVal === 'number') return value !== defaultVal
  if (typeof defaultVal === 'string') return value !== defaultVal && String(value).length > 0
  return false
}

export function SiteFeatureSection({
  ns,
  sectionId,
  sectionLabelKey,
  features,
  enabled,
  values,
  query,
  onPatch,
  onResetSection,
}: {
  ns: string
  sectionId: string
  sectionLabelKey: string
  features: SiteFeatureDef[]
  enabled: boolean
  values: Record<string, boolean | number | string | undefined>
  query: string
  onPatch: (values: Record<string, boolean | number | string>) => void
  onResetSection: () => void
}) {
  const { t } = useTranslation()
  const { search, navKey } = useRouter()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return features.filter((f) => {
      if (!q) return true
      return (
        f.id.toLowerCase().includes(q) ||
        t(sectionLabelKey).toLowerCase().includes(q) ||
        t(`${ns}.features.${f.id}.label`).toLowerCase().includes(q)
      )
    })
  }, [features, query, t, sectionLabelKey, ns])

  const shouldExpand = useMemo(() => {
    const focusId = parseSearchParam(search, 'focus')
    const sectionParam = parseSearchParam(search, 'section')
    if (focusId === `section-${sectionId}` || sectionParam === sectionId) return true
    if (focusId && filtered.some((f) => f.id === focusId)) return true
    return false
  }, [search, sectionId, filtered])

  const [open, setOpen] = useState(true)
  const [expandSync, setExpandSync] = useState(`${search}|${navKey}`)
  const expandKey = `${search}|${navKey}`
  if (shouldExpand && expandKey !== expandSync) {
    setExpandSync(expandKey)
    if (!open) setOpen(true)
  }

  if (!filtered.length) return null

  const active = filtered.filter((f) => isActive(values[f.id], f.default)).length

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left"
        data-search-id={`section-${sectionId}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs font-semibold">{t(sectionLabelKey)}</span>
        <span className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">{active}/{filtered.length}</Badge>
          <ChevronDownIcon className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <>
          <ul className="flex flex-col divide-y border-t">
            {filtered.map((f) => (
              <SiteFeatureRow
                key={f.id}
                ns={ns}
                feature={f}
                enabled={enabled}
                value={values[f.id]}
                onPatch={onPatch}
              />
            ))}
          </ul>
          <div className="border-t px-3 py-2">
            <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={onResetSection}>
              {t(`${ns}.resetSection`)}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
