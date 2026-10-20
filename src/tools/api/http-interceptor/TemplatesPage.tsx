import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { addRulesFromTemplate, type InterceptorState } from '@/core/interceptor'
import { INTERCEPTOR_TEMPLATES, type InterceptorTemplate } from '@/features/interceptor/templatesCatalog'
import { ruleTypeBadge } from '@/features/interceptor/ruleTypeMeta'
import type { RulesNav } from '@/features/interceptor/useRulesNav'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { sendMessage } from '@/core/messaging'

import { TemplatePreviewDialog } from './TemplatePreviewDialog'

interface Props {
  state: InterceptorState
  onStateChange: (state: InterceptorState) => void
  nav: RulesNav
}

export function TemplatesPage({ state, onStateChange, nav }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<InterceptorTemplate | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return INTERCEPTOR_TEMPLATES
    return INTERCEPTOR_TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q)),
    )
  }, [query])

  const previewRules = preview ? preview.build() : []

  const useTemplate = async () => {
    if (!preview) return
    const built = preview.build()
    const { rules, groups, firstId } = await addRulesFromTemplate(built, preview.groupName)
    onStateChange({ ...state, rules, groups })
    void sendMessage({ type: 'INTERCEPTOR_SYNC' })
    setPreview(null)
    if (firstId) nav.goEditor(firstId)
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('interceptor.templates.search')}
        className="max-w-md"
      />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t('interceptor.templates.colName')}</th>
              <th className="px-3 py-2">{t('interceptor.templates.colDescription')}</th>
              <th className="w-20 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((tpl) => {
              const types = [...new Set(tpl.build().map((r) => r.type))]
              return (
                <tr key={tpl.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => setPreview(tpl)}
                    >
                      {tpl.name}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {types.map((type) => (
                        <span key={type} className="rounded bg-muted px-1 text-[10px] font-semibold">
                          {ruleTypeBadge(type)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{tpl.description}</td>
                  <td className="px-3 py-2">
                    <Button type="button" variant="outline" size="xs" onClick={() => setPreview(tpl)}>
                      View
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <TemplatePreviewDialog
        template={preview}
        previewRules={previewRules}
        onClose={() => setPreview(null)}
        onUse={() => void useTemplate()}
      />
    </div>
  )
}
