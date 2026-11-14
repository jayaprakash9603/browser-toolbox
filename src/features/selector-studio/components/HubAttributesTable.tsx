import { useTranslation } from 'react-i18next'

import type { SelectorSnapshot } from '@/core/engines/selector-studio'
import { CopyButton } from '@/shared/components/CopyButton'

function AttrRow({ name, value }: { name: string; value: string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-3 align-top text-[11px] text-muted-foreground">{name}</td>
      <td className="min-w-0 py-2 align-top font-mono text-[11px] leading-5">
        <span className="inline-flex max-w-full items-start gap-2">
          <span className="min-w-0 break-all pt-0.5">{value}</span>
          <CopyButton text={value} size="icon-xs" />
        </span>
      </td>
    </tr>
  )
}

export function HubAttributesTable({ snapshot }: { snapshot: SelectorSnapshot }) {
  const { t } = useTranslation()
  const attrs = Object.entries(snapshot.attributes).filter(([name]) => name !== 'class' && name !== 'id')
  const hasRows = Boolean(snapshot.tag || snapshot.id || snapshot.classes.length || attrs.length)

  if (!hasRows) {
    return (
      <p className="py-6 text-center text-[11px] text-muted-foreground">{t('studio.hub.noAttributes')}</p>
    )
  }

  const classList = snapshot.classes
  const classJoined = snapshot.attributes.class || classList.join(' ')

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-3 font-medium">{t('studio.hub.attrName')}</th>
          <th className="py-2 font-medium">{t('studio.hub.attrValue')}</th>
        </tr>
      </thead>
      <tbody>
        <AttrRow name="tag" value={snapshot.tag} />
        {snapshot.id ? <AttrRow name="id" value={snapshot.id} /> : null}
        {classList.length > 0 && (
          <tr className="border-b border-border/50">
            <td className="py-2 pr-3 align-top text-[11px] text-muted-foreground">class</td>
            <td className="min-w-0 py-2 align-top">
              <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {classList.map((cls) => (
                    <span
                      key={cls}
                      className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/40 px-1.5 py-1 font-mono text-[11px] leading-4"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
                <CopyButton text={classJoined} size="icon-xs" />
              </div>
            </td>
          </tr>
        )}
        {attrs.map(([name, value]) => (
          <AttrRow key={`${name}:${value}`} name={name} value={value} />
        ))}
      </tbody>
    </table>
  )
}
