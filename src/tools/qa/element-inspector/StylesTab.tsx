import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { parseColor, rgbToHex } from '@/core/engines/color'
import type { CapturedElement } from '@/core/engines/selector'
import { CopyButton } from '@/shared/components/CopyButton'
import { Input } from '@/shared/components/ui/input'

const GROUPS = [
  { id: 'color', keys: ['color', 'background-color', 'opacity', 'visibility'] },
  { id: 'type', keys: ['font-size', 'font-family', 'font-weight', 'line-height'] },
  { id: 'layout', keys: ['display', 'position', 'z-index', 'overflow', 'box-sizing', 'cursor'] },
  { id: 'box', keys: ['margin', 'padding', 'border'] },
] as const

export function StylesTab({ element }: { element: CapturedElement }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const styles = element.computedStyles
  const filter = query.trim().toLowerCase()

  const grouped = useMemo(() => {
    const known = new Set<string>(GROUPS.flatMap((group) => [...group.keys]))
    const extra = Object.keys(styles).filter((key) => !known.has(key))
    return [
      ...GROUPS.map((group) => ({
        id: group.id,
        title: t(`inspectorEl.group.${group.id}`),
        rows: group.keys
          .filter((key) => styles[key])
          .filter((key) => !filter || key.includes(filter) || styles[key].toLowerCase().includes(filter))
          .map((key) => [key, styles[key]] as const),
      })),
      extra.length > 0
        ? {
            id: 'other',
            title: t('qa.computedStyles'),
            rows: extra
              .filter((key) => !filter || key.includes(filter) || styles[key].toLowerCase().includes(filter))
              .map((key) => [key, styles[key]] as const),
          }
        : null,
    ].filter((group) => group && group.rows.length > 0)
  }, [styles, filter, t])

  const json = JSON.stringify(styles, null, 2)

  return (
    <div className="flex flex-col gap-2.5" data-search-id="section-computed">
      <TypeSample element={element} />
      <div className="flex items-center gap-1.5">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('inspectorEl.searchStyles')}
          aria-label={t('inspectorEl.searchStyles')}
          className="h-8"
        />
        <CopyButton text={json} />
      </div>
      {grouped.map(
        (group) =>
          group && (
            <section key={group.id} className="rounded-xl border bg-card p-2.5 shadow-xs">
              <h3 className="mb-1 text-[11px] font-medium text-muted-foreground">{group.title}</h3>
              <div className="space-y-0.5 font-mono text-[11px] leading-5">
                {group.rows.map(([name, value]) => (
                  <StyleRow key={name} name={name} value={value} />
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  )
}

function TypeSample({ element }: { element: CapturedElement }) {
  const { t } = useTranslation()
  const styles = element.computedStyles
  return (
    <div className="rounded-xl border bg-card p-2.5 shadow-xs">
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{t('inspectorEl.sampleType')}</p>
      <p
        className="truncate"
        style={{
          color: styles.color,
          backgroundColor: styles['background-color'],
          fontFamily: styles['font-family'],
          fontSize: styles['font-size'],
          fontWeight: styles['font-weight'],
          lineHeight: styles['line-height'],
          opacity: styles.opacity,
        }}
      >
        The quick brown fox — {styles['font-size']} {styles['font-weight']}
      </p>
    </div>
  )
}

function StyleRow({ name, value }: { name: string; value: string }) {
  const parsed = parseColor(value)
  const swatch = parsed.ok ? rgbToHex(parsed.value) : null
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {swatch ? (
        <span
          className="size-3 shrink-0 rounded-sm border"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      ) : null}
      <span className="text-primary">{name}:</span>
      <span className="min-w-0 truncate text-muted-foreground">{value}</span>
      <CopyButton text={`${name}: ${value}`} />
    </div>
  )
}
