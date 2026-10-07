import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/app/router'
import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from 'lucide-react'

import { analyzeHeadings, analyzeImages } from '@/core/engines/seo'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { toolRegistry } from '@/core/registry'
import { useAccessibilityTool } from '../_shared'
import type { PageInfo } from '@/chrome/content/index'

interface A11yIssue {
  severity: 'error' | 'warning'
  message: string
}

export default function AccessibilityToolkitTool() {
  const { t } = useTranslation()
  const tool = useAccessibilityTool('accessibility.toolkit')
  const [page, setPage] = useState<PageInfo | null>(null)
  const [loaded, setLoaded] = useState(false)
  const contrastTool = toolRegistry.get('design.contrast-checker')

  useEffect(() => {
    let live = true
    const run = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id == null) return null
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' })
        return (response?.data ?? response) as PageInfo
      } catch { return null }
    }
    void run().then((value) => { if (live) setPage(value) }).finally(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [])

  const issues: A11yIssue[] = page ? buildIssues(page) : []
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length

  return (
    <ToolPage tool={tool}>
      {!loaded ? <p className="text-xs text-muted-foreground">{t('nav.loading')}</p> : !page ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">{t('a11y.noPage')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={errors > 0 ? 'border-red-500/40 text-red-700 dark:text-red-400' : 'border-green-500/40 text-green-700 dark:text-green-400'}>
              {t('a11y.errors', { count: errors })}
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">{t('a11y.warnings', { count: warnings })}</Badge>
          </div>
          {issues.length === 0 ? (
            <div className="flex items-center gap-1.5 rounded border border-green-500/40 bg-green-500/5 p-2 text-[11px] text-green-700 dark:text-green-400">
              <CheckCircle2Icon className="size-3.5" /> {t('a11y.noIssues')}
            </div>
          ) : (
            <div className="space-y-1">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5 rounded border p-1.5">
                  {issue.severity === 'error' ? <XCircleIcon className="mt-0.5 size-3.5 shrink-0 text-red-600" /> : <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600" />}
                  <p className="text-[11px]">{issue.message}</p>
                </div>
              ))}
            </div>
          )}
          {contrastTool && (
            <p className="text-[11px] text-muted-foreground">
              {t('a11y.contrastHint')}{' '}
              <Link to={contrastTool.route} className="text-primary hover:underline">{t('a11y.openContrast')}</Link>
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">{t('a11y.disclaimer')}</p>
        </div>
      )}
    </ToolPage>
  )
}

function buildIssues(page: PageInfo): A11yIssue[] {
  const issues: A11yIssue[] = []
  const imageStats = analyzeImages(page.images)
  if (imageStats.missingAlt > 0) issues.push({ severity: 'error', message: `${imageStats.missingAlt} image(s) missing alt text.` })
  issues.push(...analyzeHeadings(page.headings).map((h) => ({ severity: h.severity, message: h.message })))
  const emptyLinks = page.links.filter((l) => !l.text.trim()).length
  if (emptyLinks > 0) issues.push({ severity: 'warning', message: `${emptyLinks} link(s) with no accessible name.` })
  if (!page.language) issues.push({ severity: 'warning', message: 'Missing lang attribute on <html>.' })
  if (!page.title.trim()) issues.push({ severity: 'error', message: 'Missing page <title>.' })
  return issues
}
