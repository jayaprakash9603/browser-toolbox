import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon } from 'lucide-react'

import { buildTimelineSections, type HistoryPage, type TimelineDayKey, type TimeOfDay } from '@/core/history-manager'
import { Button } from '@/shared/components/ui/button'

import { HistoryRow, type HistoryRowActions } from './HistoryRow'
import { HistoryVirtualList } from './HistoryVirtualList'

interface TimelineTabProps {
  pages: HistoryPage[]
  compact: boolean
  selected: Set<string>
  rowActions: HistoryRowActions
}

export function TimelineTab({ pages, compact, selected, rowActions }: TimelineTabProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const labels = useMemo(
    () => ({
      today: t('historyManager.day.today'),
      yesterday: t('historyManager.day.yesterday'),
      earlierThisWeek: t('historyManager.day.earlierThisWeek'),
      lastWeek: t('historyManager.day.lastWeek'),
      earlierThisMonth: t('historyManager.day.earlierThisMonth'),
      older: t('historyManager.day.older'),
      morning: t('historyManager.slot.morning'),
      afternoon: t('historyManager.slot.afternoon'),
      evening: t('historyManager.slot.evening'),
      night: t('historyManager.slot.night'),
    }),
    [t],
  )

  const sections = useMemo(
    () => buildTimelineSections(pages, labels as Record<TimelineDayKey | TimeOfDay, string>),
    [labels, pages],
  )

  const flat = useMemo(() => {
    const rows: { page: HistoryPage; key: string }[] = []
    for (const section of sections) {
      const sectionKey = section.key
      if (collapsed.has(sectionKey)) continue
      for (const slot of section.slots) {
        const slotKey = `${sectionKey}-${slot.timeOfDay}`
        if (collapsed.has(slotKey)) continue
        slot.pages.forEach((page) => rows.push({ page, key: page.id }))
      }
    }
    return rows
  }, [collapsed, sections])

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {sections.map((section) => (
        <section key={section.key}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-2 h-8 w-full justify-between rounded-lg px-2 font-semibold text-foreground hover:bg-muted/50"
            onClick={() => toggle(section.key)}
          >
            {section.label}
            <ChevronRightIcon className={collapsed.has(section.key) ? '' : 'rotate-90'} />
          </Button>
          {!collapsed.has(section.key) &&
            section.slots.map((slot) => (
              <div key={slot.timeOfDay} className="mb-2">
                <button
                  type="button"
                  className="mb-1.5 flex w-full items-center justify-between rounded-md bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  onClick={() => toggle(`${section.key}-${slot.timeOfDay}`)}
                >
                  {slot.label}
                  <span className="tabular-nums">{slot.pages.length}</span>
                </button>
                {!collapsed.has(`${section.key}-${slot.timeOfDay}`) && (
                  <HistoryVirtualList count={slot.pages.length} className="space-y-0.5">
                    {(index) => (
                      <HistoryRow
                        page={slot.pages[index]!}
                        selected={selected.has(slot.pages[index]!.id)}
                        compact={compact}
                        actions={rowActions}
                      />
                    )}
                  </HistoryVirtualList>
                )}
              </div>
            ))}
        </section>
      ))}
      {flat.length === 0 && sections.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">{t('historyManager.emptySearch')}</p>
      )}
    </div>
  )
}
