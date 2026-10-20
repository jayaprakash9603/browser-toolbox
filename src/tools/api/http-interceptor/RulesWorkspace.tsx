import { ListIcon, LayoutTemplateIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { InterceptorState } from '@/core/interceptor'
import { useRulesNav } from '@/features/interceptor/useRulesNav'
import { cn } from '@/shared/utils/cn'

import { RuleEditorPage } from './RuleEditorPage'
import { RulesList } from './RulesList'
import { TemplatesPage } from './TemplatesPage'

interface Props {
  state: InterceptorState
  onStateChange: (state: InterceptorState) => void
  /** DevTools panel: no hash routing. */
  embedded?: boolean
}

export function RulesWorkspace({ state, onStateChange, embedded }: Props) {
  const { t } = useTranslation()
  const nav = useRulesNav(embedded)

  const showSideNav = nav.view !== 'editor'

  return (
    <div className="flex min-h-[480px] gap-3">
      {showSideNav && (
        <nav className="hidden w-28 shrink-0 flex-col gap-1 text-xs @[400px]:flex">
          <button
            type="button"
            onClick={nav.goList}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted',
              nav.view === 'list' && 'bg-primary/10 font-medium text-primary',
            )}
          >
            <ListIcon className="size-3.5" />
            {t('interceptor.rules.nav.mine')}
          </button>
          <button
            type="button"
            onClick={nav.goTemplates}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted',
              nav.view === 'templates' && 'bg-primary/10 font-medium text-primary',
            )}
          >
            <LayoutTemplateIcon className="size-3.5" />
            {t('interceptor.rules.nav.templates')}
          </button>
        </nav>
      )}
      <div className="min-w-0 flex-1">
        {nav.view === 'list' && (
          <RulesList state={state} onStateChange={onStateChange} nav={nav} />
        )}
        {nav.view === 'templates' && (
          <TemplatesPage state={state} onStateChange={onStateChange} nav={nav} />
        )}
        {nav.view === 'editor' && (
          <RuleEditorPage state={state} onStateChange={onStateChange} nav={nav} />
        )}
      </div>
    </div>
  )
}
