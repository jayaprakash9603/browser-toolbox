import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HTTP_STATUS_CODES } from '@/core/engines/testdata'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { SearchInput } from '@/shared/components/SearchInput'
import { useQaTool } from '../_shared'

const CATEGORY_STYLE: Record<string, string> = {
  Informational: 'border-sky-500/40 text-sky-700 dark:text-sky-400',
  Success: 'border-green-500/40 text-green-700 dark:text-green-400',
  Redirect: 'border-amber-500/40 text-amber-700 dark:text-amber-400',
  'Client error': 'border-orange-500/40 text-orange-700 dark:text-orange-400',
  'Server error': 'border-red-500/40 text-red-700 dark:text-red-400',
}

export default function HttpStatusTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.http-status')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HTTP_STATUS_CODES
    return HTTP_STATUS_CODES.filter(
      (entry) =>
        String(entry.code).includes(q) ||
        entry.name.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('qa.searchStatus')}
          ariaLabel={t('qa.searchStatus')}
        />
        <div className="space-y-1.5">
          {filtered.map((entry) => (
            <div key={entry.code} className="rounded-md border p-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {entry.code}
                </Badge>
                <span className="text-xs font-medium">{entry.name}</span>
                <Badge
                  variant="outline"
                  className={`ml-auto text-[9px] ${CATEGORY_STYLE[entry.category] ?? ''}`}
                >
                  {entry.category}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{entry.hint}</p>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {t('common.noMatches')}
            </p>
          )}
        </div>
      </div>
    </ToolPage>
  )
}
