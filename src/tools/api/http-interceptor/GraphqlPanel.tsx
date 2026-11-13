import { useTranslation } from 'react-i18next'

import type { GraphQLMetadata } from '@/core/interceptor/apiFinderTypes'
import { Button } from '@/shared/components/ui/button'

export function GraphqlPanel({
  meta,
  onEdit,
}: {
  meta: GraphQLMetadata
  onEdit?: (query: string, variables?: string) => void
}) {
  const { t } = useTranslation()
  const variables = meta.variables ? JSON.stringify(meta.variables, null, 2) : ''
  return (
    <section className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          GraphQL
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {meta.operationType ?? 'operation'}
          {meta.operationName ? ` · ${meta.operationName}` : ''}
        </span>
      </div>
      {meta.query && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-2 font-mono text-[11px]">
          {meta.query}
        </pre>
      )}
      {variables && (
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-2 font-mono text-[11px]">
          {variables}
        </pre>
      )}
      <div className="flex flex-wrap gap-1.5">
        {meta.query && (
          <Button type="button" variant="outline" size="xs" onClick={() => void navigator.clipboard.writeText(meta.query ?? '')}>
            {t('interceptor.graphql.copyQuery')}
          </Button>
        )}
        {variables && (
          <Button type="button" variant="outline" size="xs" onClick={() => void navigator.clipboard.writeText(variables)}>
            {t('interceptor.graphql.copyVars')}
          </Button>
        )}
        {onEdit && meta.query && (
          <Button type="button" variant="outline" size="xs" onClick={() => onEdit(meta.query ?? '', variables)}>
            {t('interceptor.graphql.edit')}
          </Button>
        )}
      </div>
    </section>
  )
}
