import { useTranslation } from 'react-i18next'

import type { AncestorNode, SelectorSnapshot } from '@/core/engines/selector-studio/types'
import { cn } from '@/shared/utils/cn'

function nodeChip(node: AncestorNode | { tag: string; id?: string }): string {
  const id = node.id ? `#${node.id}` : ''
  return `${node.tag}${id}`
}

export function RelationshipExplorer({ snapshot }: { snapshot: SelectorSnapshot }) {
  const { t } = useTranslation()
  const rows: { id: string; label: string; detail: string }[] = []

  snapshot.parentChain.forEach((node, index) => {
    const label =
      index === 0
        ? t('studio.parent')
        : index === 1
          ? t('studio.hub.grandparent')
          : t('studio.hub.ancestor', { depth: index + 1 })
    rows.push({ id: `ancestor-${index}`, label, detail: nodeChip(node) })
  })
  if (snapshot.previousSibling) {
    rows.push({
      id: 'prev-sibling',
      label: t('studio.hub.prevSibling'),
      detail: nodeChip(snapshot.previousSibling),
    })
  }
  if (snapshot.nextSibling) {
    rows.push({
      id: 'next-sibling',
      label: t('studio.hub.nextSibling'),
      detail: nodeChip(snapshot.nextSibling),
    })
  }
  if (snapshot.label) {
    rows.push({
      id: 'label',
      label: t('studio.hub.labelAssoc'),
      detail: snapshot.label.text,
    })
  }

  if (!rows.length) return null

  return (
    <details className="shrink-0 border-t border-[#e1e4e8] bg-[#fafbfc] px-2 py-1.5 text-[10px]">
      <summary className="cursor-pointer font-medium text-[#24292f]">{t('studio.hub.relationships')}</summary>
      <ul className="mt-1.5 space-y-0.5 text-[#57606a]">
        {rows.map((row) => (
          <li key={row.id} className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-[#24292f]">{row.label}</span>
            <span className={cn('min-w-0 truncate font-mono')} title={row.detail}>
              {row.detail}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[9px] text-[#57606a]">{t('studio.hub.relationshipsHint')}</p>
    </details>
  )
}