import { useMemo, useState } from 'react'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { usePayloadText } from '@/shared/hooks/usePayloadText'
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon } from 'lucide-react'

import {
  COMMON_PATTERNS,
  DEFAULT_REGEX_FLAGS,
  replaceWithRegex,
  testRegex,
  type RegexFlags,
} from '@/core/engines/regex'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, useDevTool } from '../_shared'

const FLAG_LABELS: { key: keyof RegexFlags; label: string; title: string }[] = [
  { key: 'global', label: 'g', title: 'Global' },
  { key: 'ignoreCase', label: 'i', title: 'Ignore case' },
  { key: 'multiline', label: 'm', title: 'Multiline' },
  { key: 'dotAll', label: 's', title: 'Dot all' },
]

export default function RegexToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.regex-toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', ['test', 'replace', 'library'] as const, 'test')
  const [pattern, setPattern] = useState('')
  usePayloadText(tool.id, (text) => setPattern(text.replace(/^\/(.+)\/[a-z]*$/s, '$1')))
  const [flags, setFlags] = useState<RegexFlags>(DEFAULT_REGEX_FLAGS)
  const [input, setInput] = useState('')
  const [replacement, setReplacement] = useState('')

  const result = useMemo(
    () => (pattern ? testRegex(pattern, input, flags) : null),
    [pattern, input, flags],
  )
  const replaced = useMemo(
    () =>
      pattern && tab === 'replace' ? replaceWithRegex(pattern, replacement, input, flags) : null,
    [pattern, replacement, input, flags, tab],
  )

  const toggleFlag = (key: keyof RegexFlags) => setFlags((f) => ({ ...f, [key]: !f[key] }))

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="test">{t('dev.tabTest')}</TabsTrigger>
            <TabsTrigger value="replace">{t('dev.tabReplace')}</TabsTrigger>
            <TabsTrigger value="library">{t('dev.tabLibrary')}</TabsTrigger>
          </TabsList>

        {tab !== 'library' && (
          <>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder={t('dev.regexPattern')}
                aria-label={t('dev.regexPattern')}
                className="flex-1 font-mono"
              />
              <span className="text-muted-foreground">
                /{flags.global ? 'g' : ''}
                {flags.ignoreCase ? 'i' : ''}
                {flags.multiline ? 'm' : ''}
                {flags.dotAll ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {FLAG_LABELS.map(({ key, label, title }) => (
                <label key={key} className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={flags[key]}
                    onCheckedChange={() => toggleFlag(key)}
                    aria-label={title}
                  />
                  <span className="font-mono">{label}</span>
                </label>
              ))}
            </div>
            <TextEditor
              value={input}
              onChange={setInput}
              placeholder={t('dev.regexTestText')}
              ariaLabel={t('dev.regexTestText')}
              minRows={5}
            />
          </>
        )}

        <TabsContent value="test" className="mt-0">
          {result && !result.ok && <JsonErrorView message={result.error} />}
          {result?.ok && (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {result.riskWarnings.map((warning) => (
                <div
                  key={warning}
                  className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
                  {warning}
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{t('text.matches', { count: result.totalCount })}</Badge>
                <span className="text-muted-foreground">{result.durationMs}ms</span>
                {result.truncated && (
                  <span className="text-muted-foreground">({t('dev.truncated')})</span>
                )}
              </div>
              <div className="scrollbar-styled min-h-0 flex-1 space-y-1 overflow-y-auto">
                {result.matches.slice(0, 50).map((match, index) => (
                  <div
                    key={`${match.index}-${index}`}
                    className="rounded border bg-muted/40 p-1.5 font-mono text-[11px]"
                  >
                    <span className="text-primary">{match.match || '(empty)'}</span>
                    <span className="ml-2 text-muted-foreground">@{match.index}</span>
                    {match.groups.length > 0 && (
                      <div className="mt-0.5 text-muted-foreground">
                        {match.groups.map((group, gi) => (
                          <span key={gi} className="mr-2">
                            ${gi + 1}: {group ?? '—'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="replace" className="mt-0">
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <Input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder={t('dev.replaceWith')}
              aria-label={t('dev.replaceWith')}
              className="font-mono"
            />
            {replaced && !replaced.ok && <JsonErrorView message={replaced.error} />}
            {replaced?.ok && (
              <>
                <div className="text-xs text-muted-foreground">
                  {t('text.replaced', { count: replaced.count })}
                </div>
                <pre className="scrollbar-both min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                  {replaced.output}
                </pre>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-0">
          <div className="space-y-1.5">
            {COMMON_PATTERNS.map((entry) => (
              <Button
                key={entry.id}
                variant="outline"
                onClick={() => {
                  setPattern(entry.pattern)
                  setTab('test')
                }}
                className="h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left whitespace-normal active:scale-[0.99]"
              >
                <span className="text-[13px] font-medium">{entry.label}</span>
                <code className="break-all font-mono text-xs text-[color:var(--syntax-string)]">
                  {entry.pattern}
                </code>
                <span className="text-xs font-normal text-muted-foreground">{entry.description}</span>
              </Button>
            ))}
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}
