import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConicalIcon, GlobeIcon, CodeIcon } from 'lucide-react'

import { toolRegistry } from '@/core/registry'
import { filterTools } from '@/features/search/filterTools'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolCard } from '@/shared/components/ToolCard'

const DEVTOOLS_CAPABILITIES = ['DEVTOOLS', 'PAGE_ACCESS', 'CONTENT_SCRIPT']

export default function DevToolsPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const tools = useMemo(
    () =>
      toolRegistry
        .getAll()
        .filter(
          (tool) =>
            (tool.status ?? 'active') === 'active' &&
            tool.capabilities.some((capability) => DEVTOOLS_CAPABILITIES.includes(capability)),
        ),
    [],
  )

  const { results } = useMemo(() => filterTools(tools, query, [], []), [tools, query])

  const shown = query.trim() ? results : tools

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <FlaskConicalIcon className="size-4 text-primary" />
          {t('devtools.title', { defaultValue: 'Toolbox — DevTools' })}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t('devtools.subtitle', {
            defaultValue: 'Page-aware tools, sharing the same engines as the side panel.',
          })}
        </p>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t('nav.searchToolsShortcut')}
        ariaLabel={t('nav.searchTools')}
        className="mb-4"
      />

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <GlobeIcon className="size-8" />
          <p className="text-sm">
            {t('devtools.empty', {
              defaultValue:
                'No page-aware tools are enabled yet. QA and Web toolkits will appear here as they ship.',
            })}
          </p>
          <p className="flex items-center gap-1 text-xs">
            <CodeIcon className="size-3.5" />
            {t('devtools.hint', { defaultValue: 'All other tools live in the side panel.' })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 @[360px]:grid-cols-2 @[560px]:grid-cols-3">
          {shown.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
