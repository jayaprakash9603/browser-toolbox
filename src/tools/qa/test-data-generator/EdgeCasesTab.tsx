import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { CheckIcon, CopyIcon } from 'lucide-react'

import { EDGE_CASE_GROUPS, type EdgeCase, type EdgeCaseGroup } from '@/core/engines/testdata'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { useCopyFlag } from './shared'

function visibleValue(value: string, empty: string): string {
  if (value === '') return empty
  return value
    .replace(/\t/g, '⇥')
    .replace(/\r/g, '␍')
    .replace(/\n/g, '␊')
}

function CaseRow({
  item,
  copied,
  onCopy,
}: {
  item: EdgeCase
  copied: boolean
  onCopy: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="w-full shrink-0 truncate text-[11px] text-muted-foreground sm:w-40 sm:text-xs">{item.label}</span>
      <code className="min-w-0 flex-1 basis-40 truncate font-mono text-xs text-foreground">
        {visibleValue(item.value, t('testData.edge.empty'))}
      </code>
      {item.tag && (
        <Badge
          variant="outline"
          className={cn(
            'shrink-0',
            item.tag === 'valid'
              ? 'border-green-500/40 text-green-600 dark:text-green-400'
              : 'border-destructive/40 text-destructive',
          )}
        >
          {t(`testData.edge.${item.tag}`)}
        </Badge>
      )}
      <span className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {copied ? <CheckIcon className="size-3.5 text-green-600" /> : <CopyIcon className="size-3.5" />}
      </span>
    </button>
  )
}

function GroupCard({
  group,
  index,
  copiedId,
  onCopyItem,
  onCopyGroup,
}: {
  group: EdgeCaseGroup
  index: number
  copiedId: string | null
  onCopyItem: (value: string, id: string) => void
  onCopyGroup: (group: EdgeCaseGroup) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const groupCopyId = `group:${group.id}`
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reduce ? 0 : index * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex flex-col rounded-xl border bg-card/40"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold">{t(`testData.edge.group.${group.id}`)}</h3>
          <Badge variant="secondary">{group.items.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onCopyGroup(group)}
          aria-label={t('testData.edge.copyGroup')}
        >
          {copiedId === groupCopyId ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
          {t('testData.edge.copyList')}
        </Button>
      </header>
      <div className="flex flex-col p-1">
        {group.items.map((item, itemIndex) => {
          const id = `${group.id}:${itemIndex}`
          return (
            <CaseRow key={id} item={item} copied={copiedId === id} onCopy={() => onCopyItem(item.value, id)} />
          )
        })}
      </div>
    </motion.section>
  )
}

export function EdgeCasesTab() {
  const { t } = useTranslation()
  const { copiedId, copy } = useCopyFlag()

  const copyGroup = (group: EdgeCaseGroup) =>
    copy(group.items.map((item) => item.value).join('\n'), `group:${group.id}`)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">{t('testData.edge.title')}</h2>
        <p className="text-xs text-muted-foreground">{t('testData.edge.subtitle')}</p>
      </div>
      <div className="scrollbar-both min-h-0 flex-1 overflow-auto">
        <div className="grid gap-3 pb-1 md:grid-cols-2">
          {EDGE_CASE_GROUPS.map((group, index) => (
            <GroupCard
              key={group.id}
              group={group}
              index={index}
              copiedId={copiedId}
              onCopyItem={copy}
              onCopyGroup={copyGroup}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
