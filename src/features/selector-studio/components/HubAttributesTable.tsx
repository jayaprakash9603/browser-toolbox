import { useTranslation } from 'react-i18next'

import type { SelectorSnapshot } from '@/core/engines/selector-studio'
import { CopyButton } from '@/shared/components/CopyButton'

export function HubAttributesTable({ snapshot }: { snapshot: SelectorSnapshot }) {
  const { t } = useTranslation()
  const rows: [string, string][] = [
    ['tag', snapshot.tag],
    ...(snapshot.id ? ([['id', snapshot.id]] as [string, string][]) : []),
    ...snapshot.classes.map((cls) => ['class', cls] as [string, string]),
    ...Object.entries(snapshot.attributes),
  ]

  if (!rows.length) {
    return (
      <p className="py-6 text-center text-[11px] text-muted-foreground">{t('studio.hub.noAttributes')}</p>
    )
  }

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-1 pr-2 font-medium">{t('studio.hub.attrName')}</th>
          <th className="py-1 font-medium">{t('studio.hub.attrValue')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={`${name}:${value}`} className="border-b border-border/50">
            <td className="py-1 pr-2 align-top text-muted-foreground">{name}</td>
            <td className="min-w-0 py-1 align-top font-mono">
              <span className="inline-flex max-w-full items-start gap-1">
                <span className="min-w-0 break-all">{value}</span>
                <CopyButton text={value} size="icon-xs" />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
